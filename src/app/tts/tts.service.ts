import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface TTSOptions {
    text: string;
    voice?: string;
    responseFormat?: 'mp3' | 'wav' | 'opus' | 'flac';
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

    constructor(private readonly configService: ConfigService) {
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
     * Generate speech from text using YarnGPT API
     * Returns audio buffer
     */
    async generateSpeech(options: TTSOptions): Promise<Buffer> {
        if (!this.apiKey) {
            throw new BadRequestException('TTS service is not configured. Please set YARNGPT_API_KEY.');
        }

        const { text, voice = this.defaultVoice, responseFormat = 'mp3' } = options;

        if (!text || text.trim().length === 0) {
            throw new BadRequestException('Text is required for TTS generation');
        }

        const validatedVoice = this.validateVoice(voice);
        const MAX_CHUNK_LENGTH = 800; // Reduced from 1900 to prevent timeouts

        // If text is within limit, send directly
        if (text.length <= MAX_CHUNK_LENGTH) {
            this.logger.log(`Generating TTS: voice=${validatedVoice}, format=${responseFormat}, length=${text.length}`);
            return this.callTtsApi(text, validatedVoice, responseFormat);
        }

        // Chunking logic
        this.logger.log(`Text length (${text.length}) exceeds chunk limit. Chunking...`);
        const chunks = this.chunkText(text, MAX_CHUNK_LENGTH);
        this.logger.log(`Split into ${chunks.length} chunks.`);

        try {
            // Process chunks sequentially to maintain order and avoid rate limits
            const buffers: Buffer[] = [];
            for (const [index, chunk] of chunks.entries()) {
                this.logger.log(`Processing chunk ${index + 1}/${chunks.length} (${chunk.length} chars)`);
                const buffer = await this.callTtsApi(chunk, validatedVoice, responseFormat);
                buffers.push(buffer);
            }

            const combinedBuffer = Buffer.concat(buffers);
            this.logger.log(`Successfully combined ${buffers.length} chunks into ${combinedBuffer.length} bytes`);
            return combinedBuffer;

        } catch (error: any) {
            this.logger.error('Error processing TTS chunks', error);
            throw error;
        }
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
                    timeout: 120000, // Increased to 120s to handle slow responses
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
     * Configure smart chunking to respect usage limits
     */
    private chunkText(text: string, maxLength: number): string[] {
        if (text.length <= maxLength) return [text];

        const chunks: string[] = [];
        let currentChunk = '';

        // Split by sentence terminators first
        // This regex tries to capture sentences ending with . ! ? or the last part if no terminator
        const sentences = text.match(/[^.!?]+(?:[.!?]|$)/g) || [text];

        for (const sentence of sentences) {
            // If adding the next sentence makes the current chunk too long
            if ((currentChunk + sentence).length > maxLength) {
                // If currentChunk has content, push it
                if (currentChunk.trim().length > 0) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }

                // If the sentence itself is too long, hard split it
                if (sentence.length > maxLength) {
                    let remaining = sentence;
                    while (remaining.length > 0) {
                        const slice = remaining.slice(0, maxLength);
                        chunks.push(slice.trim()); // Push the slice directly as a new chunk
                        remaining = remaining.slice(maxLength);
                    }
                } else {
                    // The sentence fits into an empty chunk, so start a new chunk with it
                    currentChunk = sentence;
                }
            } else {
                // Sentence fits, add it to the current chunk
                currentChunk += sentence;
            }
        }

        // Add any remaining content in currentChunk
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}
