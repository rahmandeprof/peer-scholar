import {
    Controller,
    Post,
    Get,
    Body,
    Res,
    Param,
    Req,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { TTSService, TTSOptions } from './tts.service';

import { IsString, IsOptional, IsEnum } from 'class-validator';

class GenerateTTSDto {
    @IsString()
    text: string;

    @IsOptional()
    @IsString()
    voice?: string;

    @IsOptional()
    @IsEnum(['mp3', 'wav', 'opus', 'flac'])
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

        const contentTypes: Record<string, string> = {
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            opus: 'audio/opus',
            flac: 'audio/flac',
        };

        res.set({
            'Content-Type': contentTypes[options.responseFormat || 'mp3'],
            'Content-Length': audioBuffer.length,
            'Cache-Control': 'public, max-age=3600',
        });

        res.send(audioBuffer);
    }

    /**
     * Generate speech with caching (recommended)
     * Returns audio URL instead of buffer
     */
    @Post('generate-cached')
    @UseGuards(AuthGuard('jwt'))
    async generateSpeechCached(@Body() dto: GenerateTTSDto) {
        this.logger.log(`TTS cached request: voice=${dto.voice}, length=${dto.text?.length}`);

        const options: TTSOptions = {
            text: dto.text,
            voice: dto.voice,
            responseFormat: dto.responseFormat || 'mp3',
        };

        const result = await this.ttsService.generateSpeechWithCache(options);

        return {
            success: true,
            audioUrl: result.audioUrl,
            cached: result.cached,
        };
    }

    /**
     * Start streaming TTS generation
     * Returns immediately with job ID for polling
     */
    @Post('start-stream')
    @UseGuards(AuthGuard('jwt'))
    async startStream(@Body() dto: GenerateTTSDto, @Req() req: Request) {
        this.logger.log(`TTS stream start: voice=${dto.voice}, length=${dto.text?.length}`);

        const options: TTSOptions = {
            text: dto.text,
            voice: dto.voice,
            responseFormat: dto.responseFormat || 'mp3',
        };

        const userId = (req as any).user?.id;
        const result = await this.ttsService.startStreamJob(options, userId);

        return {
            success: true,
            ...result,
        };
    }

    /**
     * Get streaming TTS job status
     * Poll this endpoint to get available chunk URLs
     */
    @Get('job/:id')
    @UseGuards(AuthGuard('jwt'))
    async getJobStatus(@Param('id') jobId: string) {
        const result = await this.ttsService.getJobStatus(jobId);

        return {
            success: true,
            ...result,
        };
    }
}
