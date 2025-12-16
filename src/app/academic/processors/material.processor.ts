import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Material, MaterialStatus, ProcessingStatus, ProcessingVersion } from '../entities/material.entity';
import { DocumentSegment } from '../entities/document-segment.entity';
import { MaterialChunk } from '../entities/material-chunk.entity';

import { OcrService } from '@/app/document-processing/services/ocr.service';
import { PdfImageService } from '@/app/document-processing/services/pdf-image.service';
import { CleanerService } from '@/app/document-processing/services/cleaner.service';
import { QuizGenerator, QuizDifficulty } from '@/app/quiz-engine';
import { SegmentSelectorService } from '@/app/document-processing/services/segment-selector.service';

import axios from 'axios';
import { Job } from 'bull';
import * as JSZip from 'jszip';
import * as mammoth from 'mammoth';
import OpenAI from 'openai';
import * as pdfLib from 'pdf-parse';
import { Repository } from 'typeorm';
import { parseStringPromise } from 'xml2js';

@Processor('materials')
export class MaterialProcessor {
  private readonly logger = new Logger(MaterialProcessor.name);
  private openai?: OpenAI;

  constructor(
    @InjectRepository(Material)
    private materialRepo: Repository<Material>,
    @InjectRepository(MaterialChunk)
    private chunkRepo: Repository<MaterialChunk>,
    @InjectRepository(DocumentSegment)
    private segmentRepo: Repository<DocumentSegment>,
    private configService: ConfigService,
    private ocrService: OcrService,
    private pdfImageService: PdfImageService,
    private cleanerService: CleanerService,
    private quizGenerator: QuizGenerator,
    private segmentSelector: SegmentSelectorService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  @Process('process-material')
  async handleProcessing(job: Job<{ materialId: string; fileUrl: string }>) {
    const { materialId, fileUrl } = job.data;

    this.logger.debug(`Start processing material: ${materialId}`);

    try {
      const material = await this.materialRepo.findOneBy({ id: materialId });

      if (!material) {
        this.logger.error(`Material not found: ${materialId}`);

        return;
      }

      material.status = MaterialStatus.PROCESSING;
      material.processingStatus = ProcessingStatus.EXTRACTING; // Fix: Update processingStatus for frontend
      await this.materialRepo.save(material);

      // 1. Download file
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data);

      // 2. Extract text
      let text = '';

      this.logger.log(`[TEXT-EXTRACT] Material: ${materialId}`);
      this.logger.log(`[TEXT-EXTRACT] FileType: "${material.fileType}"`);
      this.logger.log(`[TEXT-EXTRACT] Title: "${material.title}"`);
      this.logger.log(`[TEXT-EXTRACT] Buffer size: ${buffer.length} bytes`);

      if (material.fileType === 'application/pdf' || material.fileType?.includes('pdf')) {
        this.logger.log(`[TEXT-EXTRACT] Matched: PDF`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const candidate = (pdfLib as any).default ?? pdfLib;

        const pdfParseFn =
          typeof candidate === 'function'
            ? candidate
            : (candidate.PDFParse ?? candidate);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any;

        try {
          // Try function call first

          data = await pdfParseFn(buffer);
        } catch (err) {
          if (
            err instanceof Error &&
            err.message.includes(
              "Class constructors cannot be invoked without 'new'",
            )
          ) {
            const instance = new pdfParseFn(buffer);

            // Check if instance is a promise or has data
            if (instance instanceof Promise) {
              data = await instance;
            } else {
              data = instance;
            }
          } else {
            this.logger.error(`[TEXT-EXTRACT] PDF parse error:`, err);
            throw err;
          }
        }

        text = data.text;
        this.logger.log(`[TEXT-EXTRACT] PDF extracted ${text?.length ?? 0} chars`);
      } else if (
        material.fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        material.fileType?.includes('wordprocessingml') ||
        material.title?.toLowerCase().endsWith('.docx')
      ) {
        this.logger.log(`[TEXT-EXTRACT] Matched: DOCX`);
        const result = await mammoth.extractRawText({ buffer });

        text = result.value;
        this.logger.log(`[TEXT-EXTRACT] DOCX extracted ${text?.length ?? 0} chars`);
      } else if (material.fileType === 'text/plain') {
        this.logger.log(`[TEXT-EXTRACT] Matched: Plain text`);
        text = buffer.toString('utf-8');
        this.logger.log(`[TEXT-EXTRACT] TXT extracted ${text?.length ?? 0} chars`);
      } else if (
        material.fileType ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        material.fileType?.includes('presentationml') ||
        material.title?.toLowerCase().endsWith('.pptx')
      ) {
        this.logger.log(`[TEXT-EXTRACT] Matched: PPTX`);
        text = await this.extractTextFromPPTX(buffer);
        this.logger.log(`[TEXT-EXTRACT] PPTX extracted ${text?.length ?? 0} chars`);
      } else if (material.fileType?.startsWith('image/')) {
        // Direct OCR for images
        this.logger.log(`[TEXT-EXTRACT] Matched: Image - using OCR`);
        text = await this.extractTextViaOCR(material.fileUrl, true);
        this.logger.log(`[TEXT-EXTRACT] Image OCR extracted ${text?.length ?? 0} chars`);
      } else if (
        material.fileType?.includes('msword') ||
        material.title?.toLowerCase().endsWith('.doc')
      ) {
        // Legacy .doc files
        this.logger.log(`[TEXT-EXTRACT] Matched: Legacy DOC - attempting officeparser`);
        try {
          const officeparser = await import('officeparser');
          text = await officeparser.parseOfficeAsync(buffer) || '';
          this.logger.log(`[TEXT-EXTRACT] DOC extracted ${text?.length ?? 0} chars`);
        } catch (e) {
          this.logger.warn(`[TEXT-EXTRACT] DOC extraction failed:`, e);
        }
      } else if (
        material.fileType?.includes('ms-powerpoint') ||
        material.title?.toLowerCase().endsWith('.ppt')
      ) {
        // Legacy .ppt files
        this.logger.log(`[TEXT-EXTRACT] Matched: Legacy PPT - attempting officeparser`);
        try {
          const officeparser = await import('officeparser');
          text = await officeparser.parseOfficeAsync(buffer) || '';
          this.logger.log(`[TEXT-EXTRACT] PPT extracted ${text?.length ?? 0} chars`);
        } catch (e) {
          this.logger.warn(`[TEXT-EXTRACT] PPT extraction failed:`, e);
        }
      } else {
        this.logger.warn(`[TEXT-EXTRACT] NO MATCH for fileType: "${material.fileType}"`);
      }

      // Log text preview
      if (text && text.length > 0) {
        const preview = text.substring(0, 200).replace(/\n/g, ' ').trim();
        this.logger.log(`[TEXT-EXTRACT] Preview: "${preview}..."`);
      }

      // Fallback to OCR if text is empty or too short (likely scanned PDF or image-only PPT)
      if (!text || text.trim().length < 50) {
        this.logger.warn(
          `[TEXT-EXTRACT] Low content (${text?.trim().length ?? 0} chars). Attempting OCR fallback...`,
        );
        const ocrText = await this.extractTextViaOCR(material.fileUrl);

        if (ocrText) {
          text = ocrText;
          this.logger.log(`[TEXT-EXTRACT] OCR fallback extracted ${text?.length ?? 0} chars`);
        }
      }

      if (!text) {
        this.logger.warn(`[TEXT-EXTRACT] FINAL: No text extracted from material: ${materialId}`);
        text =
          'This document appears to be a scanned image or contains no extractable text. AI features like summary and chat may be limited.';
      }

      // 3. Clean and chunk Text (only if we have meaningful text)
      material.processingStatus = ProcessingStatus.CLEANING;
      await this.materialRepo.save(material);

      if (
        text !==
        'This document appears to be a scanned image or contains no extractable text. AI features like summary and chat may be limited.'
      ) {
        const chunks = this.chunkText(text, 1000, 200);

        this.logger.debug(`Generated ${chunks.length.toString()} chunks`);

        // 4. Generate Embeddings & Save
        for (let i = 0; i < chunks.length; i++) {
          const content = chunks[i];
          let embedding: number[] = [];

          if (this.openai) {
            try {
              // eslint-disable-next-line no-await-in-loop
              const embeddingResponse = await this.openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: content,
              });

              embedding = embeddingResponse.data[0].embedding;
            } catch (e) {
              this.logger.warn(
                `Failed to generate embedding for chunk ${i.toString()}`,
                e,
              );
            }
          }

          const chunk = this.chunkRepo.create({
            material,
            content,
            chunkIndex: i,
            embedding: embedding.length > 0 ? embedding : null,
          });

          // eslint-disable-next-line no-await-in-loop
          await this.chunkRepo.save(chunk);
        }

        // 5. Extract Topics (using first 2000 chars)
        if (this.openai) {
          try {
            const topicPrompt = `Extract 5-10 relevant academic topics or tags from the following text. Return them as a comma-separated list. Text: ${text.slice(0, 2000)}`;
            const completion = await this.openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: topicPrompt }],
            });
            const tagsText = completion.choices[0].message.content ?? '';
            const tags = tagsText
              .split(',')
              .map((t) => t.trim())
              .filter((t) => t.length > 0);

            material.tags = tags;
          } catch (e) {
            this.logger.warn('Failed to extract topics', e);
          }
        }
      }

      material.status = MaterialStatus.READY;
      material.content = text;
      material.processingStatus = ProcessingStatus.SEGMENTING;
      await this.materialRepo.save(material);

      // Trigger segmentation for the new architecture
      await this.segmentMaterial(material, text);

      // Mark as completed
      material.processingStatus = ProcessingStatus.COMPLETED;
      await this.materialRepo.save(material);

      this.logger.debug('Material processing completed');

      // Pre-generate quiz in background for faster first access
      this.preGenerateQuiz(material).catch((err) => {
        this.logger.warn(`[PRE-GEN] Quiz pre-generation failed for ${materialId}:`, err.message);
      });

      // Pre-generate summary in background for faster first access
      this.preGenerateSummary(material).catch((err) => {
        this.logger.warn(`[PRE-GEN] Summary pre-generation failed for ${materialId}:`, err.message);
      });
    } catch (error) {
      this.logger.error(`Failed to process material: ${materialId}`, error);
      await this.materialRepo.update(materialId, {
        status: MaterialStatus.FAILED,
        processingStatus: ProcessingStatus.FAILED, // Fix: Update processingStatus for frontend
      });
    }
  }

  private async extractTextFromPPTX(buffer: Buffer): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      const slideFiles = Object.keys(zip.files).filter((fileName) =>
        /ppt\/slides\/slide\d+\.xml/.exec(fileName),
      );

      let fullText = '';

      for (const fileName of slideFiles) {
        // eslint-disable-next-line no-await-in-loop
        const xmlContent = await zip.files[fileName].async('text');
        // eslint-disable-next-line no-await-in-loop
        const result = await parseStringPromise(xmlContent);

        // Traverse XML to find <a:t> tags (text)
        const extractTextFromObj = (obj: unknown): string => {
          let text = '';

          if (typeof obj === 'object' && obj !== null) {
            const typedObj = obj as Record<string, unknown>;

            if (typedObj['a:t']) {
              if (Array.isArray(typedObj['a:t'])) {
                text += typedObj['a:t'].join(' ') + ' ';
              } else {
                text += String(typedObj['a:t'] as string | number) + ' ';
              }
            }
            for (const key in typedObj) {
              if (Object.prototype.hasOwnProperty.call(typedObj, key)) {
                text += extractTextFromObj(typedObj[key]);
              }
            }
          } else if (Array.isArray(obj)) {
            for (const item of obj) {
              text += extractTextFromObj(item);
            }
          }

          return text;
        };

        fullText += extractTextFromObj(result) + '\n';
      }

      return fullText;
    } catch (error) {
      this.logger.error('Failed to extract text from PPTX', error);

      return '';
    }
  }

  private async extractTextViaOCR(
    fileUrl: string,
    isImage = false,
  ): Promise<string> {
    if (!this.openai) return '';

    try {
      if (isImage) {
        // For single images, send URL directly
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Transcribe the text from this image exactly. Do not add any commentary.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: fileUrl,
                  },
                },
              ],
            },
          ],
        });

        return response.choices[0].message.content ?? '';
      }

      // Cloudinary PDF-to-Image URL construction
      // We'll grab the first 5 pages to avoid excessive token usage/cost,
      // or we can try to grab more if needed. For now, let's try 5 pages.
      const pagesToScan = 5;
      let combinedText = '';

      // The fileUrl is like: https://res.cloudinary.com/cloudname/image/upload/v12345/folder/file.pdf
      // To get page 1 as image: https://res.cloudinary.com/cloudname/image/upload/pg_1/v12345/folder/file.jpg

      // Regex to insert pg_X parameter
      const urlParts = fileUrl.split('/upload/');

      if (urlParts.length !== 2) return '';

      const baseUrl = urlParts[0] + '/upload';
      const filePart = urlParts[1];
      // Remove extension and ensure it ends with .jpg for the request
      const fileId = filePart.substring(0, filePart.lastIndexOf('.'));

      for (let i = 1; i <= pagesToScan; i++) {
        const imageUrl = `${baseUrl}/pg_${i.toString()}/${fileId}.jpg`;

        try {
          // eslint-disable-next-line no-await-in-loop
          const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Transcribe the text from this document page exactly. Do not add any commentary.',
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: imageUrl,
                    },
                  },
                ],
              },
            ],
          });

          const pageText = response.choices[0].message.content;

          if (pageText) {
            combinedText += pageText + '\n\n';
          }
        } catch {
          // If a page fails (e.g., page doesn't exist), we stop
          break;
        }
      }

      return combinedText;
    } catch (error) {
      this.logger.error('Failed to perform OCR via Vision', error);

      return '';
    }
  }

  private chunkText(
    text: string,
    chunkSize: number,
    overlap: number,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);

      chunks.push(text.slice(start, end));
      start += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Segment material text into document segments for the new architecture
   */
  private async segmentMaterial(material: Material, text: string): Promise<void> {
    if (!text || text.trim().length < 50) {
      return;
    }

    try {
      // Delete existing segments
      await this.segmentRepo.delete({ materialId: material.id });

      // Simple segmentation: split by paragraphs and merge to ~400 tokens
      const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 0);
      const segments: { text: string; tokenCount: number }[] = [];

      let currentSegment = '';
      const targetTokens = 400;
      const maxTokens = 600;

      for (const paragraph of paragraphs) {
        const paragraphTokens = Math.ceil(paragraph.length / 4);
        const currentTokens = Math.ceil(currentSegment.length / 4);

        // If paragraph alone is too large, split it
        if (paragraphTokens > maxTokens) {
          if (currentSegment.trim()) {
            segments.push({
              text: currentSegment.trim(),
              tokenCount: Math.ceil(currentSegment.length / 4),
            });
            currentSegment = '';
          }

          // Split large paragraph at sentence boundaries
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          let tempSegment = '';

          for (const sentence of sentences) {
            const sentenceTokens = Math.ceil(sentence.length / 4);
            const tempTokens = Math.ceil(tempSegment.length / 4);

            if (tempTokens + sentenceTokens > maxTokens && tempSegment) {
              segments.push({
                text: tempSegment.trim(),
                tokenCount: tempTokens,
              });
              tempSegment = sentence;
            } else {
              tempSegment += sentence;
            }
          }

          if (tempSegment.trim()) {
            segments.push({
              text: tempSegment.trim(),
              tokenCount: Math.ceil(tempSegment.length / 4),
            });
          }
          continue;
        }

        // If adding would exceed target substantially
        if (currentTokens > 0 && currentTokens + paragraphTokens > targetTokens * 1.5) {
          segments.push({
            text: currentSegment.trim(),
            tokenCount: currentTokens,
          });
          currentSegment = paragraph;
        } else {
          currentSegment += (currentSegment ? '\n\n' : '') + paragraph;
        }

        // If reached target, flush
        const newTokens = Math.ceil(currentSegment.length / 4);
        if (newTokens >= targetTokens) {
          segments.push({
            text: currentSegment.trim(),
            tokenCount: newTokens,
          });
          currentSegment = '';
        }
      }

      // Flush remaining
      if (currentSegment.trim()) {
        segments.push({
          text: currentSegment.trim(),
          tokenCount: Math.ceil(currentSegment.length / 4),
        });
      }

      // Save segments
      for (let i = 0; i < segments.length; i++) {
        const segment = new DocumentSegment();
        segment.materialId = material.id;
        segment.text = segments[i].text;
        segment.tokenCount = segments[i].tokenCount;
        segment.segmentIndex = i;

        // eslint-disable-next-line no-await-in-loop
        await this.segmentRepo.save(segment);
      }

      this.logger.log(`Created ${segments.length} segments for material ${material.id}`);
    } catch (error) {
      this.logger.error(`Failed to segment material ${material.id}:`, error);
      // Don't throw - segmentation failure shouldn't fail the whole process
    }
  }

  /**
   * Lazy upgrade handler - upgrades v1 documents to v2 on-demand.
   * Uses existing content for segmentation without re-extraction.
   */
  @Process('upgrade-to-v2')
  async handleUpgrade(job: Job<{ materialId: string }>) {
    const { materialId } = job.data;

    this.logger.log(`[UPGRADE] Starting lazy upgrade for material: ${materialId}`);

    try {
      const material = await this.materialRepo.findOneBy({ id: materialId });

      if (!material) {
        this.logger.error(`[UPGRADE] Material not found: ${materialId}`);
        return;
      }

      // Prevent duplicate upgrades
      if (material.processingVersion === ProcessingVersion.V2) {
        this.logger.debug(`[UPGRADE] Material ${materialId} is already v2, skipping`);
        return;
      }

      // Check if already has segments (might be in progress)
      const existingSegments = await this.segmentRepo.count({ where: { materialId } });
      if (existingSegments > 0) {
        this.logger.debug(`[UPGRADE] Material ${materialId} already has ${existingSegments} segments`);
        material.processingVersion = ProcessingVersion.V2;
        material.processingStatus = ProcessingStatus.COMPLETED;
        await this.materialRepo.save(material);
        return;
      }

      // Use existing content for segmentation (no re-extraction by default)
      let text = material.content;

      if (!text || text.trim().length < 50) {
        // Check if this is a PDF that might need OCR extraction
        const isPdf = material.fileType?.toLowerCase().includes('pdf');

        if (isPdf && material.fileUrl) {
          this.logger.log(`[UPGRADE] Material ${materialId} has insufficient content, attempting OCR extraction`);

          try {
            // Mark as OCR extracting
            material.processingStatus = ProcessingStatus.OCR_EXTRACTING;
            await this.materialRepo.save(material);

            // Download the PDF file
            const response = await axios.get(material.fileUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
            });
            const pdfBuffer = Buffer.from(response.data);

            // Convert PDF to images
            const images = await this.pdfImageService.convertToImages(pdfBuffer);

            if (images.length === 0) {
              throw new Error('No images generated from PDF');
            }

            // Run OCR on images
            const ocrResult = await this.ocrService.extractFromImages(images);

            // Clean the OCR text
            text = this.ocrService.cleanOcrText(ocrResult.text);
            text = this.cleanerService.clean(text);

            this.logger.log(`[UPGRADE] OCR extracted ${text.length} chars with ${ocrResult.confidence.toFixed(1)}% confidence`);

            if (!text || text.trim().length < 50) {
              this.logger.warn(`[UPGRADE] OCR extraction still insufficient for ${materialId}`);
              // Leave as v1 - will continue using legacy flow
              material.processingStatus = ProcessingStatus.PENDING;
              await this.materialRepo.save(material);
              return;
            }

            // Update material content with OCR result and track OCR usage
            material.content = text;
            material.isOcrProcessed = true;
            material.ocrConfidence = ocrResult.confidence;

          } catch (ocrError) {
            this.logger.error(`[UPGRADE] OCR failed for ${materialId}:`, ocrError);
            // Leave as v1 - will continue using legacy flow
            material.processingStatus = ProcessingStatus.PENDING;
            await this.materialRepo.save(material);
            return;
          }
        } else {
          this.logger.warn(`[UPGRADE] Material ${materialId} has insufficient content and is not a PDF, skipping upgrade`);
          // Leave as v1 - will continue using legacy flow
          return;
        }
      }

      // Mark as processing
      material.processingStatus = ProcessingStatus.SEGMENTING;
      await this.materialRepo.save(material);

      // Run segmentation using existing method
      await this.segmentMaterial(material, text);

      // Mark as upgraded
      material.processingVersion = ProcessingVersion.V2;
      material.processingStatus = ProcessingStatus.COMPLETED;
      await this.materialRepo.save(material);

      this.logger.log(`[UPGRADE] Successfully upgraded material ${materialId} to v2`);
    } catch (error) {
      this.logger.error(`[UPGRADE] Failed to upgrade material ${materialId}:`, error);

      // Mark as failed but keep v1 status so legacy flow continues
      const material = await this.materialRepo.findOneBy({ id: materialId });
      if (material) {
        material.processingStatus = ProcessingStatus.FAILED;
        await this.materialRepo.save(material);
      }
    }
  }

  /**
   * Pre-generate a quiz for the material in background
   * This runs after processing completes so first user request gets cached quiz
   */
  private async preGenerateQuiz(material: Material): Promise<void> {
    try {
      this.logger.log(`[PRE-GEN] Starting quiz pre-generation for material ${material.id}`);

      // Select segments for quiz generation
      const { segments } = await this.segmentSelector.selectSegments(material.id, {
        maxTokens: 8000,
        maxSegments: 20,
      });

      if (segments.length === 0) {
        this.logger.warn(`[PRE-GEN] No segments available for ${material.id}, skipping pre-gen`);
        return;
      }

      // Generate quiz with default settings (intermediate, 5 questions)
      const result = await this.quizGenerator.generateFromSegments(
        segments,
        material.title,
        QuizDifficulty.INTERMEDIATE,
        5,
      );

      if (!result.success || !result.data) {
        this.logger.warn(`[PRE-GEN] Quiz generation failed for ${material.id}: ${result.error}`);
        return;
      }

      // Cache the quiz on the material
      material.quiz = result.data.questions as any;
      material.quizGeneratedVersion = material.materialVersion;
      await this.materialRepo.save(material);

      this.logger.log(`[PRE-GEN] Successfully pre-generated ${result.data.questions.length} quiz questions for material ${material.id}`);
    } catch (error) {
      // Don't throw - this is a background optimization, not critical path
      this.logger.warn(`[PRE-GEN] Pre-generation failed for ${material.id}:`, error instanceof Error ? error.message : error);
    }
  }

  /**
   * Pre-generate a summary for the material in background
   * This runs after processing completes so first user request gets cached summary
   */
  private async preGenerateSummary(material: Material): Promise<void> {
    // Skip if already has summary
    if (material.summary) {
      this.logger.debug(`[PRE-GEN] Material ${material.id} already has summary, skipping`);
      return;
    }

    if (!this.openai) {
      this.logger.warn(`[PRE-GEN] OpenAI not configured, skipping summary pre-generation`);
      return;
    }

    try {
      this.logger.log(`[PRE-GEN] Starting summary pre-generation for material ${material.id}`);

      // Get segments for this material
      const segments = await this.segmentRepo.find({
        where: { materialId: material.id },
        order: { segmentIndex: 'ASC' },
        take: 20, // First ~8000 tokens
      });

      if (segments.length === 0) {
        this.logger.warn(`[PRE-GEN] No segments available for ${material.id}, skipping summary pre-gen`);
        return;
      }

      // Build content from segments
      let content = '';
      let tokenCount = 0;
      for (const segment of segments) {
        if (tokenCount + segment.tokenCount > 6000) break;
        content += segment.text + '\n\n';
        tokenCount += segment.tokenCount;
      }

      if (!content.trim()) {
        this.logger.warn(`[PRE-GEN] No content extracted for ${material.id}`);
        return;
      }

      // Generate summary
      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following text concisely but comprehensively for a student. Focus on key concepts and main ideas.',
          },
          { role: 'user', content },
        ],
        max_tokens: 500,
      });

      const summary = response.choices[0].message.content ?? '';

      if (summary) {
        material.summary = summary;
        await this.materialRepo.save(material);
        this.logger.log(`[PRE-GEN] Successfully pre-generated summary for material ${material.id}`);
      }
    } catch (error) {
      // Don't throw - this is a background optimization, not critical path
      this.logger.warn(`[PRE-GEN] Summary pre-generation failed for ${material.id}:`, error instanceof Error ? error.message : error);
    }
  }
}

