import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import axios from 'axios';
import { Job } from 'bull';
import * as mammoth from 'mammoth';
import { Repository } from 'typeorm';
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

import { Material, MaterialStatus } from '../entities/material.entity';

@Processor('materials')
export class MaterialProcessor {
  private readonly logger = new Logger(MaterialProcessor.name);

  constructor(
    @InjectRepository(Material)
    private materialRepo: Repository<Material>,
  ) {}

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

      // 3. Save text (placeholder for vector embedding)
      // For now, we just log the length and update status
      this.logger.debug(`Extracted text length: ${text.length.toString()}`);

      material.status = MaterialStatus.READY;
      // material.content = text; // If we had a content column
      await this.materialRepo.save(material);

      this.logger.debug('Material processing completed');
    } catch (error) {
      this.logger.error(`Failed to process material: ${materialId}`, error);
      // Optionally update status to FAILED
      await this.materialRepo.update(materialId, {
        status: MaterialStatus.FAILED,
      });
    }
  }
}
