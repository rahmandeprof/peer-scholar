import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { DocumentSegment } from '../entities/document-segment.entity';
import {
  Material,
  MaterialStatus,
  ProcessingStatus,
  ProcessingVersion,
} from '../entities/material.entity';
import { MaterialChunk } from '../entities/material-chunk.entity';

import { CleanerService } from '@/app/document-processing/services/cleaner.service';
import { OcrService } from '@/app/document-processing/services/ocr.service';
import { PdfImageService } from '@/app/document-processing/services/pdf-image.service';
import { SegmentSelectorService } from '@/app/document-processing/services/segment-selector.service';

import { QuizDifficulty, QuizGenerator } from '@/app/quiz-engine';

import axios from 'axios';
import { Job } from 'bull';
import * as JSZip from 'jszip';
import OpenAI from 'openai';
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

    this.logger.debug(
      `Start enrichment (MaterialProcessor) for: ${materialId}`,
    );

    try {
      const material = await this.materialRepo.findOneBy({ id: materialId });

      if (!material) {
        this.logger.error(`Material not found: ${materialId}`);

        return;
      }

      // If content is missing, something went wrong in the previous step
      if (!material.content) {
        this.logger.warn(
          `Material ${materialId} has no content. Skipping enrichment.`,
        );

        return;
      }

      const text = material.content;

      // 3. Clean and chunk Text (only if we have meaningful text)
      // Note: DocumentProcessor already cleaned it, but we might do extra checks here or skip
      // if we trust DocumentProcessor.
      // For now, let's assume text is ready.

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
        this.logger.warn(
          `[PRE-GEN] Quiz pre-generation failed for ${materialId}:`,
          err.message,
        );
      });

      // Pre-generate summary in background for faster first access
      this.preGenerateSummary(material).catch((err) => {
        this.logger.warn(
          `[PRE-GEN] Summary pre-generation failed for ${materialId}:`,
          err.message,
        );
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

  /**
   * Extract text from a file via OCR
   * Works with any file URL (R2, Cloudinary, or any HTTP source)
   * Uses local PDF-to-image conversion + Tesseract for PDFs
   * Uses GPT-4 Vision only for direct image files
   */
  private async extractTextViaOCR(
    fileUrl: string,
    isImage = false,
  ): Promise<string> {
    try {
      if (isImage) {
        // For single images, use GPT-4 Vision if available, otherwise skip
        if (!this.openai) {
          this.logger.warn('OpenAI not configured, skipping image OCR');

          return '';
        }

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

      // For PDFs: Download, convert to images, and run Tesseract OCR
      // This works with ANY file URL (R2, Cloudinary, or any HTTP source)
      this.logger.log(
        `[OCR-FALLBACK] Downloading PDF for local OCR: ${fileUrl}`,
      );

      const pdfResponse = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds timeout
      });
      const pdfBuffer = Buffer.from(pdfResponse.data);

      this.logger.log(
        `[OCR-FALLBACK] PDF downloaded: ${pdfBuffer.length} bytes`,
      );

      // Convert PDF to images using pdftoppm
      const images = await this.pdfImageService.convertToImages(pdfBuffer);

      if (images.length === 0) {
        this.logger.warn('[OCR-FALLBACK] No images generated from PDF');

        return '';
      }

      this.logger.log(
        `[OCR-FALLBACK] Converted PDF to ${images.length} images`,
      );

      // Run Tesseract OCR on images
      const ocrResult = await this.ocrService.extractFromImages(images);

      // Clean the OCR text
      const cleanedText = this.ocrService.cleanOcrText(ocrResult.text);

      this.logger.log(
        `[OCR-FALLBACK] OCR extracted ${cleanedText.length} chars with ${ocrResult.confidence.toFixed(1)}% confidence`,
      );

      return cleanedText;
    } catch (error) {
      this.logger.error('[OCR-FALLBACK] Failed to perform OCR:', error);

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
  private async segmentMaterial(
    material: Material,
    text: string,
  ): Promise<void> {
    if (!text || text.trim().length < 50) {
      return;
    }

    try {
      // Delete existing segments
      await this.segmentRepo.delete({ materialId: material.id });

      // Simple segmentation: split by paragraphs and merge to ~400 tokens
      const paragraphs = text
        .split(/\n{2,}/)
        .filter((p) => p.trim().length > 0);
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
        if (
          currentTokens > 0 &&
          currentTokens + paragraphTokens > targetTokens * 1.5
        ) {
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

      this.logger.log(
        `Created ${segments.length} segments for material ${material.id}`,
      );
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

    this.logger.log(
      `[UPGRADE] Starting lazy upgrade for material: ${materialId}`,
    );

    try {
      const material = await this.materialRepo.findOneBy({ id: materialId });

      if (!material) {
        this.logger.error(`[UPGRADE] Material not found: ${materialId}`);

        return;
      }

      // Prevent duplicate upgrades
      if (material.processingVersion === ProcessingVersion.V2) {
        this.logger.debug(
          `[UPGRADE] Material ${materialId} is already v2, skipping`,
        );

        return;
      }

      // Check if already has segments (might be in progress)
      const existingSegments = await this.segmentRepo.count({
        where: { materialId },
      });

      if (existingSegments > 0) {
        this.logger.debug(
          `[UPGRADE] Material ${materialId} already has ${existingSegments} segments`,
        );
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
          this.logger.log(
            `[UPGRADE] Material ${materialId} has insufficient content, attempting OCR extraction`,
          );

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
            const images =
              await this.pdfImageService.convertToImages(pdfBuffer);

            if (images.length === 0) {
              throw new Error('No images generated from PDF');
            }

            // Run OCR on images
            const ocrResult = await this.ocrService.extractFromImages(images);

            // Clean the OCR text
            text = this.ocrService.cleanOcrText(ocrResult.text);
            text = this.cleanerService.clean(text);

            this.logger.log(
              `[UPGRADE] OCR extracted ${text.length} chars with ${ocrResult.confidence.toFixed(1)}% confidence`,
            );

            if (!text || text.trim().length < 50) {
              this.logger.warn(
                `[UPGRADE] OCR extraction still insufficient for ${materialId}`,
              );
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
            this.logger.error(
              `[UPGRADE] OCR failed for ${materialId}:`,
              ocrError,
            );
            // Leave as v1 - will continue using legacy flow
            material.processingStatus = ProcessingStatus.PENDING;
            await this.materialRepo.save(material);

            return;
          }
        } else {
          this.logger.warn(
            `[UPGRADE] Material ${materialId} has insufficient content and is not a PDF, skipping upgrade`,
          );

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

      this.logger.log(
        `[UPGRADE] Successfully upgraded material ${materialId} to v2`,
      );
    } catch (error) {
      this.logger.error(
        `[UPGRADE] Failed to upgrade material ${materialId}:`,
        error,
      );

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
      this.logger.log(
        `[PRE-GEN] Starting quiz pre-generation for material ${material.id}`,
      );

      // Select segments for quiz generation
      const { segments } = await this.segmentSelector.selectSegments(
        material.id,
        {
          maxTokens: 8000,
          maxSegments: 20,
        },
      );

      if (segments.length === 0) {
        this.logger.warn(
          `[PRE-GEN] No segments available for ${material.id}, skipping pre-gen`,
        );

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
        this.logger.warn(
          `[PRE-GEN] Quiz generation failed for ${material.id}: ${result.error}`,
        );

        return;
      }

      // Cache the quiz on the material
      material.quiz = result.data.questions as any;
      material.quizGeneratedVersion = material.materialVersion;
      await this.materialRepo.save(material);

      this.logger.log(
        `[PRE-GEN] Successfully pre-generated ${result.data.questions.length} quiz questions for material ${material.id}`,
      );
    } catch (error) {
      // Don't throw - this is a background optimization, not critical path
      this.logger.warn(
        `[PRE-GEN] Pre-generation failed for ${material.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  /**
   * Pre-generate a summary for the material in background
   * This runs after processing completes so first user request gets cached summary
   */
  private async preGenerateSummary(material: Material): Promise<void> {
    // Skip if already has summary
    if (material.summary) {
      this.logger.debug(
        `[PRE-GEN] Material ${material.id} already has summary, skipping`,
      );

      return;
    }

    if (!this.openai) {
      this.logger.warn(
        `[PRE-GEN] OpenAI not configured, skipping summary pre-generation`,
      );

      return;
    }

    try {
      this.logger.log(
        `[PRE-GEN] Starting summary pre-generation for material ${material.id}`,
      );

      // Get segments for this material
      const segments = await this.segmentRepo.find({
        where: { materialId: material.id },
        order: { segmentIndex: 'ASC' },
        take: 20, // First ~8000 tokens
      });

      if (segments.length === 0) {
        this.logger.warn(
          `[PRE-GEN] No segments available for ${material.id}, skipping summary pre-gen`,
        );

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
        model:
          this.configService.get<string>('OPENAI_CHAT_MODEL') ??
          'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Summarize the following text concisely but comprehensively for a student. Focus on key concepts and main ideas.',
          },
          { role: 'user', content },
        ],
        max_tokens: 500,
      });

      const summary = response.choices[0].message.content ?? '';

      if (summary) {
        material.summary = summary;
        await this.materialRepo.save(material);
        this.logger.log(
          `[PRE-GEN] Successfully pre-generated summary for material ${material.id}`,
        );
      }
    } catch (error) {
      // Don't throw - this is a background optimization, not critical path
      this.logger.warn(
        `[PRE-GEN] Summary pre-generation failed for ${material.id}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}
