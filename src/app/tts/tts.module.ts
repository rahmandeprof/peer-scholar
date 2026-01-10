import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TTSService } from './tts.service';
import { TTSController } from './tts.controller';
import { TtsCache } from './entities/tts-cache.entity';
import { CommonModule } from '@/app/common/common.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([TtsCache]),
        CommonModule, // For CloudinaryService
    ],
    controllers: [TTSController],
    providers: [TTSService],
    exports: [TTSService],
})
export class TTSModule { }
