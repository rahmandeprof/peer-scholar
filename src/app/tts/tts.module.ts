import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { TTSService } from './tts.service';
import { TTSController } from './tts.controller';
import { TtsCache } from './entities/tts-cache.entity';
import { TtsJob } from './entities/tts-job.entity';
import { TtsProcessor } from './tts.processor';
import { CommonModule } from '@/app/common/common.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([TtsCache, TtsJob]),
        BullModule.registerQueue({
            name: 'tts',
        }),
        CommonModule, // For R2Service
    ],
    controllers: [TTSController],
    providers: [TTSService, TtsProcessor],
    exports: [TTSService],
})
export class TTSModule { }
