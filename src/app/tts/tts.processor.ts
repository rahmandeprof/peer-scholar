import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { TtsJob, TtsJobStatus } from './entities/tts-job.entity';
import { R2Service } from '@/app/common/services/r2.service';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

interface TtsChunkJobData {
    jobId: string;
    chunkIndex: number;
    text: string;
    voice: string;
    format: string;
}

@Processor('tts')
export class TtsProcessor {
    private readonly logger = new Logger(TtsProcessor.name);
    private readonly apiUrl = 'https://yarngpt.ai/api/v1/tts';
    private readonly apiKey: string | undefined;

    constructor(
        @InjectRepository(TtsJob)
        private readonly ttsJobRepo: Repository<TtsJob>,
        private readonly r2Service: R2Service,
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.get<string>('YARNGPT_API_KEY');
    }

    @Process('generate-chunk')
    async handleGenerateChunk(job: Job<TtsChunkJobData>) {
        const { jobId, chunkIndex, text, voice, format } = job.data;
        this.logger.log(`Processing chunk ${chunkIndex} for job ${jobId}`);

        try {
            // Get the TTS job
            const ttsJob = await this.ttsJobRepo.findOne({ where: { id: jobId } });
            if (!ttsJob) {
                this.logger.error(`TTS job ${jobId} not found`);
                return;
            }

            // Update status to processing on first chunk
            if (chunkIndex === 0 && ttsJob.status === TtsJobStatus.PENDING) {
                ttsJob.status = TtsJobStatus.PROCESSING;
                await this.ttsJobRepo.save(ttsJob);
            }

            // Generate audio for this chunk
            const audioBuffer = await this.callTtsApi(text, voice, format);

            // Upload to R2
            const chunkId = `tts_${jobId}_chunk_${chunkIndex}`;
            const uploadResult = await this.r2Service.uploadBuffer(audioBuffer, {
                folder: 'tts-chunks',
                format,
                publicId: chunkId,
            });

            // Update job with chunk URL using atomic increment to prevent race conditions
            // Use query builder for atomic update of completedChunks
            await this.ttsJobRepo.manager.transaction(async transactionalEntityManager => {
                // Atomically update the chunk URL and increment counter
                const result = await transactionalEntityManager
                    .createQueryBuilder()
                    .update(TtsJob)
                    .set({
                        completedChunks: () => 'completed_chunks + 1',
                    })
                    .where('id = :id', { id: jobId })
                    .returning(['completed_chunks', 'total_chunks'])
                    .execute();

                // Get current job state to update chunkUrls array
                const updatedJob = await transactionalEntityManager.findOne(TtsJob, { where: { id: jobId } });
                if (updatedJob) {
                    // Ensure chunkUrls array is long enough
                    while (updatedJob.chunkUrls.length <= chunkIndex) {
                        updatedJob.chunkUrls.push('');
                    }
                    updatedJob.chunkUrls[chunkIndex] = uploadResult.url;

                    // Check if all chunks are done (use returned value for accuracy)
                    const newCompletedCount = result.raw?.[0]?.completed_chunks ?? updatedJob.completedChunks;
                    if (newCompletedCount >= updatedJob.totalChunks) {
                        updatedJob.status = TtsJobStatus.COMPLETED;
                        this.logger.log(`Job ${jobId} completed with all ${updatedJob.totalChunks} chunks`);
                    }

                    await transactionalEntityManager.save(updatedJob);
                    this.logger.log(`Chunk ${chunkIndex} completed for job ${jobId} (${newCompletedCount}/${updatedJob.totalChunks})`);
                }
            });
        } catch (error: any) {
            this.logger.error(`Failed to process chunk ${chunkIndex} for job ${jobId}:`, error.message);

            // Mark job as failed
            const ttsJob = await this.ttsJobRepo.findOne({ where: { id: jobId } });
            if (ttsJob) {
                ttsJob.status = TtsJobStatus.FAILED;
                ttsJob.errorMessage = error.message;
                await this.ttsJobRepo.save(ttsJob);
            }
        }
    }

    private async callTtsApi(text: string, voice: string, format: string): Promise<Buffer> {
        const response = await axios.post(
            this.apiUrl,
            {
                text,
                voice,
                response_format: format,
            },
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
                timeout: 120000,
            },
        );
        return Buffer.from(response.data);
    }
}
