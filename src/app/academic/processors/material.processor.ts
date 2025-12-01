import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

import { Job } from 'bull';

@Processor('materials')
export class MaterialProcessor {
  private readonly logger = new Logger(MaterialProcessor.name);

  @Process('process-material')
  async handleTranscode(job: Job) {
    this.logger.debug('Start processing material...');
    this.logger.debug(job.data);

    // Simulate processing (e.g., text extraction, AI analysis)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    this.logger.debug('Material processing completed');
  }
}
