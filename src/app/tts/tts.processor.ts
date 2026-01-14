import { Process, Processor, OnQueueFailed, OnQueueCompleted, OnQueueError, OnQueueActive } from '@nestjs/bull';
import { Logger, OnModuleInit } from '@nestjs/common';
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
export class TtsProcessor implements OnModuleInit {
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
        this.logger.log('🔧 TtsProcessor constructor called');
        this.logger.log(`   API Key configured: ${this.apiKey ? 'YES' : 'NO'}`);
    }

    onModuleInit() {
        this.logger.log('✅ TtsProcessor initialized and ready to process jobs');
    }

    @OnQueueActive()
    onActive(job: Job<TtsChunkJobData>) {
        this.logger.log(`🚀 Job ${job.id} started: chunk ${job.data.chunkIndex} for TTS job ${job.data.jobId}`);
    }

    @OnQueueCompleted()
    onCompleted(job: Job<TtsChunkJobData>) {
        this.logger.log(`✅ Job ${job.id} completed: chunk ${job.data.chunkIndex} for TTS job ${job.data.jobId}`);
    }

    @OnQueueFailed()
    onFailed(job: Job<TtsChunkJobData>, error: Error) {
        this.logger.error(`❌ Job ${job.id} FAILED: chunk ${job.data.chunkIndex} for TTS job ${job.data.jobId}`);
        this.logger.error(`   Error: ${error.message}`);
        this.logger.error(`   Stack: ${error.stack}`);
    }

    @OnQueueError()
    onError(error: Error) {
        this.logger.error(`🔥 Queue error: ${error.message}`);
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

            // Determine if this is a rate limit error (HTTP 429)
            const isRateLimited = error.response?.status === 429;

            // Mark job with appropriate status
            const ttsJob = await this.ttsJobRepo.findOne({ where: { id: jobId } });
            if (ttsJob) {
                if (isRateLimited) {
                    ttsJob.status = TtsJobStatus.RATE_LIMITED;
                    ttsJob.errorMessage = 'Text-to-speech is temporarily unavailable due to high demand. Please try again later.';
                    this.logger.warn(`⚠️ Rate limit hit for job ${jobId} - marking as rate limited`);
                } else {
                    ttsJob.status = TtsJobStatus.FAILED;
                    ttsJob.errorMessage = error.message || 'Failed to generate audio';
                }
                await this.ttsJobRepo.save(ttsJob);
            }

            // Re-throw rate limit errors so Bull can retry with longer backoff
            if (isRateLimited) {
                throw new Error('RATE_LIMITED: YarnGPT API rate limit exceeded');
            }
        }
    }

    private async callTtsApi(text: string, voice: string, format: string): Promise<Buffer> {
        this.logger.log(`📞 Calling YarnGPT API: voice=${voice}, format=${format}, text length=${text.length}`);

        try {
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

            this.logger.log(`✅ YarnGPT API returned ${response.data.byteLength} bytes`);
            return Buffer.from(response.data);
        } catch (error: any) {
            // Detailed error logging for API failures
            if (error.response) {
                // The request was made and the server responded with a status code
                this.logger.error(`❌ YarnGPT API error: HTTP ${error.response.status}`);
                this.logger.error(`   Response headers: ${JSON.stringify(error.response.headers)}`);
                // Try to decode error message if it's text
                try {
                    const errorText = Buffer.from(error.response.data).toString('utf8');
                    this.logger.error(`   Response body: ${errorText.substring(0, 500)}`);
                } catch {
                    this.logger.error(`   Response body: [binary data, ${error.response.data?.byteLength || 0} bytes]`);
                }
            } else if (error.request) {
                // The request was made but no response was received
                this.logger.error(`❌ YarnGPT API no response (timeout or network error)`);
                this.logger.error(`   Request URL: ${this.apiUrl}`);
            } else {
                // Something happened in setting up the request
                this.logger.error(`❌ YarnGPT API request setup error: ${error.message}`);
            }
            throw error;
        }
    }
}
