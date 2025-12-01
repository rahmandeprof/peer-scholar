import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Material } from '../academic/entities/material.entity';
import { MaterialChunk } from '../academic/entities/material-chunk.entity';

import { MaterialProcessor } from '../academic/processors/material.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Material, MaterialChunk]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST') ?? 'localhost',
          port: configService.get('REDIS_PORT') ?? 6379,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'materials',
    }),
  ],
  providers: [MaterialProcessor],
  exports: [BullModule],
})
export class QueueModule {}
