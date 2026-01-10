import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bull';
import { TtsJob, TtsJobStatus } from './entities/tts-job.entity';
import { TtsCache } from './entities/tts-cache.entity';
import { R2Service } from '@/app/common/services/r2.service';
import axios from 'axios';
import * as crypto from 'crypto';
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
        @InjectRepository(TtsCache)
        private readonly ttsCacheRepo: Repository<TtsCache>,
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

            // Update job with chunk URL
            const updatedJob = await this.ttsJobRepo.findOne({ where: { id: jobId } });
            if (updatedJob) {
                // Ensure chunkUrls array is long enough
                while (updatedJob.chunkUrls.length <= chunkIndex) {
                    updatedJob.chunkUrls.push('');
                }
                updatedJob.chunkUrls[chunkIndex] = uploadResult.url;
                updatedJob.completedChunks += 1;

                // Check if all chunks are done
                if (updatedJob.completedChunks >= updatedJob.totalChunks) {
                    updatedJob.status = TtsJobStatus.COMPLETED;
                    // Also save to cache for future use
                    await this.saveToCache(updatedJob);
                }

                await this.ttsJobRepo.save(updatedJob);
                this.logger.log(`Chunk ${chunkIndex} completed for job ${jobId} (${updatedJob.completedChunks}/${updatedJob.totalChunks})`);
            }
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

    private async saveToCache(job: TtsJob) {
        try {
            // Check if cache entry exists
            const existing = await this.ttsCacheRepo.findOne({
                where: { textHash: job.textHash, voice: job.voice },
            });

            if (!existing) {
                // For now, store the first chunk URL as the main URL
                // Later we could concatenate the audio files
                const cacheEntry = this.ttsCacheRepo.create({
                    textHash: job.textHash,
                    voice: job.voice,
                    audioUrl: job.chunkUrls[0], // First chunk for now
                    format: job.format,
                    accessCount: 1,
                    lastAccessedAt: new Date(),
                });
                await this.ttsCacheRepo.save(cacheEntry);
                this.logger.log(`Saved job ${job.id} to cache`);
            }
        } catch (error: any) {
            this.logger.error(`Failed to save to cache:`, error.message);
        }
    }
}
