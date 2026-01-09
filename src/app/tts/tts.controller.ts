import {
    Controller,
    Post,
    Get,
    Body,
    Res,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { TTSService, TTSOptions } from './tts.service';

class GenerateTTSDto {
    text: string;
    voice?: string;
    responseFormat?: 'mp3' | 'wav' | 'opus' | 'flac';
}

@Controller('tts')
export class TTSController {
    private readonly logger = new Logger(TTSController.name);

    constructor(private readonly ttsService: TTSService) { }

    /**
     * Get available voices
     */
    @Get('voices')
    getVoices() {
        return {
            success: true,
            voices: this.ttsService.getAvailableVoices(),
            defaultVoice: 'Idera',
        };
    }

    /**
     * Check if TTS service is configured
     */
    @Get('status')
    getStatus() {
        return {
            success: true,
            configured: this.ttsService.isConfigured(),
        };
    }

    /**
     * Generate speech from text
     * Returns audio file directly
     */
    @Post('generate')
    @UseGuards(AuthGuard('jwt'))
    async generateSpeech(
        @Body() dto: GenerateTTSDto,
        @Res() res: Response,
    ) {
        this.logger.log(`TTS request: voice=${dto.voice}, length=${dto.text?.length}`);

        const options: TTSOptions = {
            text: dto.text,
            voice: dto.voice,
            responseFormat: dto.responseFormat || 'mp3',
        };

        const audioBuffer = await this.ttsService.generateSpeech(options);

        // Set appropriate content type
        const contentTypes: Record<string, string> = {
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            opus: 'audio/opus',
            flac: 'audio/flac',
        };

        res.set({
            'Content-Type': contentTypes[options.responseFormat || 'mp3'],
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        });

        res.send(audioBuffer);
    }
}
