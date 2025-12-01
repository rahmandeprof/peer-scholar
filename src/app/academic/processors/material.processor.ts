import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import axios from 'axios';
import { Job } from 'bull';
import * as mammoth from 'mammoth';
import OpenAI from 'openai';
import { Repository } from 'typeorm';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

import { Material, MaterialStatus } from '../entities/material.entity';
import { MaterialChunk } from '../entities/material-chunk.entity';

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

      if (material.fileType === 'application/pdf') {
        const data = await pdf(buffer);

        text = data.text;
      } else if (
        material.fileType ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        material.fileType === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer });

        text = result.value;
      }

      if (!text) {
        throw new Error('No text extracted');
      }

      // 3. Chunk Text
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

      material.status = MaterialStatus.READY;
      await this.materialRepo.save(material);

      this.logger.debug('Material processing completed');
    } catch (error) {
      this.logger.error(`Failed to process material: ${materialId}`, error);
      await this.materialRepo.update(materialId, {
        status: MaterialStatus.FAILED,
      });
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
