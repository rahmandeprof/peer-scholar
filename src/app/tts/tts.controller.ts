import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { TTSOptions, TTSService } from './tts.service';

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Request, Response } from 'express';

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

  constructor(private readonly ttsService: TTSService) {}

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
  async generateSpeech(@Body() dto: GenerateTTSDto, @Res() res: Response) {
    this.logger.log(
      `TTS request: voice=${dto.voice}, length=${dto.text?.length}`,
    );

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
    this.logger.log(
      `TTS cached request: voice=${dto.voice}, length=${dto.text?.length}`,
    );

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
    this.logger.log(
      `TTS stream start: voice=${dto.voice}, length=${dto.text?.length}`,
    );

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

  // ========== Material-Level TTS Endpoints ==========

  /**
   * Start TTS generation for a material
   * Generates chunks from startChunk onwards
   */
  @Post('material/:materialId/start')
  @UseGuards(AuthGuard('jwt'))
  async startMaterialTts(
    @Param('materialId') materialId: string,
    @Body() body: { content: string; voice?: string; startChunk?: number },
  ) {
    this.logger.log(
      `Starting material TTS for ${materialId} from chunk ${body.startChunk || 0}`,
    );

    const result = await this.ttsService.startMaterialGeneration(
      materialId,
      body.content,
      body.voice || 'Idera',
      body.startChunk || 0,
    );

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Get chunk status for a material
   * Poll this endpoint to get available chunk URLs
   */
  @Get('material/:materialId/chunks')
  @UseGuards(AuthGuard('jwt'))
  async getMaterialChunks(
    @Param('materialId') materialId: string,
    @Req() req: Request,
  ) {
    const voice = (req.query.voice as string) || 'Idera';
    const result = await this.ttsService.getMaterialChunkStatus(
      materialId,
      voice,
    );

    return {
      success: true,
      ...result,
    };
  }
}
