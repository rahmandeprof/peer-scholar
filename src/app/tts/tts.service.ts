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

        // Limit text length to prevent abuse (YarnGPT handles long text but let's be reasonable)
        const maxLength = 5000;
        const trimmedText = text.length > maxLength ? text.substring(0, maxLength) : text;

        const validatedVoice = this.validateVoice(voice);

        this.logger.log(`Generating TTS: voice=${validatedVoice}, format=${responseFormat}, length=${trimmedText.length}`);

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    text: trimmedText,
                    voice: validatedVoice,
                    response_format: responseFormat,
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer',
                    timeout: 60000, // 60 second timeout for long text
                },
            );

            this.logger.log(`TTS generated successfully: ${response.data.length} bytes`);
            return Buffer.from(response.data);
        } catch (error: any) {
            this.logger.error('YarnGPT API error:', error.message);

            if (error.response) {
                const errorBody = error.response.data?.toString?.() || 'Unknown error';
                this.logger.error(`YarnGPT response: ${error.response.status} - ${errorBody}`);
                throw new BadRequestException(`TTS generation failed: ${errorBody}`);
            }

            throw new BadRequestException('Failed to generate speech. Please try again.');
        }
    }
}
