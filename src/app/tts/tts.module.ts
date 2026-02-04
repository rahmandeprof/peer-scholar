import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from '@/app/common/common.module';

import { TtsCache } from './entities/tts-cache.entity';
import { TtsJob } from './entities/tts-job.entity';
import { TtsMaterialChunk } from './entities/tts-material-chunk.entity';
import { TtsMaterialMeta } from './entities/tts-material-meta.entity';

import { TTSController } from './tts.controller';

import { TTSService } from './tts.service';

import { TtsProcessor } from './tts.processor';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      TtsCache,
      TtsJob,
      TtsMaterialChunk,
      TtsMaterialMeta,
    ]),
    BullModule.registerQueue({
      name: 'tts',
    }),
    CommonModule, // For R2Service
  ],
  controllers: [TTSController],
  providers: [TTSService, TtsProcessor],
  exports: [TTSService],
})
export class TTSModule {}
