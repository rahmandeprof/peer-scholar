import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import axios from 'axios';
import * as crypto from 'crypto';
import { TtsCache } from './entities/tts-cache.entity';
import { TtsJob, TtsJobStatus } from './entities/tts-job.entity';
import { R2Service } from '@/app/common/services/r2.service';

export interface TTSOptions {
    text: string;
    voice?: string;
    responseFormat?: 'mp3' | 'wav' | 'opus' | 'flac';
}

export interface TTSResult {
    audioUrl: string;
    cached: boolean;
}

export interface VoiceInfo {
    name: string;
    gender: 'male' | 'female';
}

@Injectable()
export class TTSService {
    private readonly logger = new Logger(TTSService.name);
    private readonly apiUrl = 'https://yarngpt.ai/api/v1/tts';
    private readonly apiKey: string | undefined;
    private readonly defaultVoice = 'Idera';

    // All available YarnGPT voices
    static readonly AVAILABLE_VOICES: VoiceInfo[] = [
        // Female voices
        { name: 'Idera', gender: 'female' },
        { name: 'Zainab', gender: 'female' },
        { name: 'Wura', gender: 'female' },
        { name: 'Chinenye', gender: 'female' },
        { name: 'Regina', gender: 'female' },
        { name: 'Adaora', gender: 'female' },
        { name: 'Mary', gender: 'female' },
        { name: 'Remi', gender: 'female' },
        // Male voices
        { name: 'Emma', gender: 'male' },
        { name: 'Osagie', gender: 'male' },
        { name: 'Jude', gender: 'male' },
        { name: 'Tayo', gender: 'male' },
        { name: 'Femi', gender: 'male' },
        { name: 'Umar', gender: 'male' },
        { name: 'Nonso', gender: 'male' },
        { name: 'Adam', gender: 'male' },
    ];

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(TtsCache)
        private readonly ttsCacheRepo: Repository<TtsCache>,
        @InjectRepository(TtsJob)
        private readonly ttsJobRepo: Repository<TtsJob>,
        @InjectQueue('tts')
        private readonly ttsQueue: Queue,
        private readonly r2Service: R2Service,
    ) {
        this.apiKey = this.configService.get<string>('YARNGPT_API_KEY');
        if (!this.apiKey) {
            this.logger.warn('YARNGPT_API_KEY not configured - TTS will not work');
        }
    }

    /**
     * Check if YarnGPT is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }

    /**
     * Get list of available voices
     */
    getAvailableVoices(): VoiceInfo[] {
        return TTSService.AVAILABLE_VOICES;
    }

    /**
     * Validate voice name
     */
    private validateVoice(voice: string): string {
        const validVoice = TTSService.AVAILABLE_VOICES.find(
            (v) => v.name.toLowerCase() === voice.toLowerCase(),
        );
        if (!validVoice) {
            this.logger.warn(`Invalid voice "${voice}", using default: ${this.defaultVoice}`);
            return this.defaultVoice;
        }
        return validVoice.name;
    }

    /**
     * Generate MD5 hash of text for cache key
     */
    private getTextHash(text: string): string {
        return crypto.createHash('md5').update(text).digest('hex');
    }

    /**
     * Check cache for existing audio
     */
    private async getCachedAudio(textHash: string, voice: string): Promise<TtsCache | null> {
        const cached = await this.ttsCacheRepo.findOne({
            where: { textHash, voice },
        });

        if (cached) {
            // Update access stats
            cached.accessCount += 1;
            cached.lastAccessedAt = new Date();
            await this.ttsCacheRepo.save(cached);
            this.logger.log(`Cache HIT for hash=${textHash.substring(0, 8)}..., voice=${voice}`);
        }

        return cached;
    }

    /**
     * Store audio in cache
     */
    private async cacheAudio(
        textHash: string,
        voice: string,
        audioUrl: string,
        publicId: string,
        format: string,
    ): Promise<TtsCache> {
        const cacheEntry = this.ttsCacheRepo.create({
            textHash,
            voice,
            audioUrl,
            publicId,
            format,
            accessCount: 1,
            lastAccessedAt: new Date(),
        });
        await this.ttsCacheRepo.save(cacheEntry);
        this.logger.log(`Cached audio: hash=${textHash.substring(0, 8)}..., voice=${voice}`);
        return cacheEntry;
    }

    /**
     * Generate speech from text using YarnGPT API with caching
     * Returns audio URL (cached or newly generated)
     */
    async generateSpeechWithCache(options: TTSOptions): Promise<TTSResult> {
        if (!this.apiKey) {
            throw new BadRequestException('TTS service is not configured. Please set YARNGPT_API_KEY.');
        }

        const { text, voice = this.defaultVoice, responseFormat = 'mp3' } = options;

        if (!text || text.trim().length === 0) {
            throw new BadRequestException('Text is required for TTS generation');
        }

        const validatedVoice = this.validateVoice(voice);
        const textHash = this.getTextHash(text);

        // Check cache first
        const cached = await this.getCachedAudio(textHash, validatedVoice);
        if (cached) {
            return { audioUrl: cached.audioUrl, cached: true };
        }

        // Not cached - generate audio
        this.logger.log(`Cache MISS for hash=${textHash.substring(0, 8)}..., voice=${validatedVoice}. Generating...`);
        const audioBuffer = await this.generateSpeechBuffer({ text, voice: validatedVoice, responseFormat });

        // Upload to Cloudinary
        const publicId = `tts_${textHash}_${validatedVoice}`;
        const uploadResult = await this.r2Service.uploadBuffer(audioBuffer, {
            folder: 'tts-cache',
            format: responseFormat,
            publicId,
        });

        // Store in cache
        await this.cacheAudio(textHash, validatedVoice, uploadResult.url, uploadResult.publicId, responseFormat);

        return { audioUrl: uploadResult.url, cached: false };
    }

    /**
     * Generate speech buffer (internal - with chunking)
     */
    private async generateSpeechBuffer(options: TTSOptions): Promise<Buffer> {
        const { text, voice = this.defaultVoice, responseFormat = 'mp3' } = options;
        const validatedVoice = this.validateVoice(voice);
        const MAX_CHUNK_LENGTH = 800;

        // If text is within limit, send directly
        if (text.length <= MAX_CHUNK_LENGTH) {
            this.logger.log(`Generating TTS: voice=${validatedVoice}, format=${responseFormat}, length=${text.length}`);
            return this.callTtsApi(text, validatedVoice, responseFormat);
        }

        // Chunking logic
        this.logger.log(`Text length (${text.length}) exceeds chunk limit. Chunking...`);
        const chunks = this.chunkText(text, MAX_CHUNK_LENGTH);
        this.logger.log(`Split into ${chunks.length} chunks.`);

        const buffers: Buffer[] = [];
        for (const [index, chunk] of chunks.entries()) {
            this.logger.log(`Processing chunk ${index + 1}/${chunks.length} (${chunk.length} chars)`);
            const buffer = await this.callTtsApi(chunk, validatedVoice, responseFormat);
            buffers.push(buffer);
        }

        const combinedBuffer = Buffer.concat(buffers);
        this.logger.log(`Successfully combined ${buffers.length} chunks into ${combinedBuffer.length} bytes`);
        return combinedBuffer;
    }

    /**
     * Legacy method for backwards compatibility - returns buffer directly
     */
    async generateSpeech(options: TTSOptions): Promise<Buffer> {
        if (!this.apiKey) {
            throw new BadRequestException('TTS service is not configured. Please set YARNGPT_API_KEY.');
        }

        const { text, voice = this.defaultVoice, responseFormat = 'mp3' } = options;

        if (!text || text.trim().length === 0) {
            throw new BadRequestException('Text is required for TTS generation');
        }

        return this.generateSpeechBuffer(options);
    }

    /**
     * Call API for a single chunk
     */
    private async callTtsApi(text: string, voice: string, responseFormat: string): Promise<Buffer> {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    text,
                    voice,
                    response_format: responseFormat,
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
            this.logger.log(`TTS generated successfully for chunk: ${response.data.length} bytes`);
            return Buffer.from(response.data);
        } catch (error: any) {
            if (error.response) {
                const errorBody = error.response.data?.toString?.() || 'Unknown error';
                throw new BadRequestException(`TTS failed: ${errorBody}`);
            }
            throw new BadRequestException(`Failed to generate speech: ${error.message}`);
        }
    }

    /**
     * Smart chunking to respect API limits
     */
    private chunkText(text: string, maxLength: number): string[] {
        if (text.length <= maxLength) return [text];

        const chunks: string[] = [];
        let currentChunk = '';
        const sentences = text.match(/[^.!?]+(?:[.!?]|$)/g) || [text];

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxLength) {
                if (currentChunk.trim().length > 0) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }

                if (sentence.length > maxLength) {
                    let remaining = sentence;
                    while (remaining.length > 0) {
                        const slice = remaining.slice(0, maxLength);
                        chunks.push(slice.trim());
                        remaining = remaining.slice(maxLength);
                    }
                } else {
                    currentChunk = sentence;
                }
            } else {
                currentChunk += sentence;
            }
        }

        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    // ========== Streaming TTS Methods ==========

    /**
     * Start a streaming TTS job
     * Chunks text and queues each chunk for background processing
     * Returns immediately with job ID for polling
     */
    async startStreamJob(options: TTSOptions, userId?: string): Promise<{ jobId: string; totalChunks: number; cached: boolean; cacheUrl?: string }> {
        if (!this.apiKey) {
            throw new BadRequestException('TTS service is not configured. Please set YARNGPT_API_KEY.');
        }

        const { text, voice = this.defaultVoice, responseFormat = 'mp3' } = options;

        if (!text || text.trim().length === 0) {
            throw new BadRequestException('Text is required for TTS generation');
        }

        const validatedVoice = this.validateVoice(voice);
        const textHash = this.getTextHash(text);

        // Check cache first
        const cached = await this.getCachedAudio(textHash, validatedVoice);
        if (cached) {
            return { jobId: '', totalChunks: 0, cached: true, cacheUrl: cached.audioUrl };
        }

        // Split text into chunks
        const MAX_CHUNK_LENGTH = 800;
        const chunks = this.chunkText(text, MAX_CHUNK_LENGTH);

        this.logger.log(`Starting stream job: ${chunks.length} chunks, voice=${validatedVoice}`);

        // Create job record
        const job = this.ttsJobRepo.create({
            textHash,
            voice: validatedVoice,
            format: responseFormat,
            status: TtsJobStatus.PENDING,
            totalChunks: chunks.length,
            completedChunks: 0,
            chunkUrls: [],
            userId,
        });
        await this.ttsJobRepo.save(job);

        // Queue each chunk for processing
        for (let i = 0; i < chunks.length; i++) {
            await this.ttsQueue.add('generate-chunk', {
                jobId: job.id,
                chunkIndex: i,
                text: chunks[i],
                voice: validatedVoice,
                format: responseFormat,
            }, {
                attempts: 2,
                backoff: { type: 'exponential', delay: 5000 },
            });
        }

        return { jobId: job.id, totalChunks: chunks.length, cached: false };
    }

    /**
     * Get the status of a streaming TTS job
     * Returns available chunk URLs for progressive playback
     */
    async getJobStatus(jobId: string): Promise<{
        status: TtsJobStatus;
        totalChunks: number;
        completedChunks: number;
        chunkUrls: string[];
        errorMessage?: string;
    }> {
        const job = await this.ttsJobRepo.findOne({ where: { id: jobId } });

        if (!job) {
            throw new NotFoundException('TTS job not found');
        }

        return {
            status: job.status,
            totalChunks: job.totalChunks,
            completedChunks: job.completedChunks,
            chunkUrls: job.chunkUrls.filter(url => url && url.length > 0),
            errorMessage: job.errorMessage,
        };
    }
}

