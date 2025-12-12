import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { Material, MaterialStatus } from '../entities/material.entity';
import { MaterialChunk } from '../entities/material-chunk.entity';

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
    private configService: ConfigService,
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

      // 3. Chunk Text (only if we have meaningful text)
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
      await this.materialRepo.save(material);

      this.logger.debug('Material processing completed');
    } catch (error) {
      this.logger.error(`Failed to process material: ${materialId}`, error);
      await this.materialRepo.update(materialId, {
        status: MaterialStatus.FAILED,
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
}
