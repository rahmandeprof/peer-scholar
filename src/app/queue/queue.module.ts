import { BullModule } from '@nestjs/bull';
import { Logger, Module } from '@nestjs/common';
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
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
        const port = configService.get<number>('REDIS_PORT') ?? 6379;
        const password = configService.get<string>('REDIS_PASSWORD');

        Logger.log(
          `[QueueModule] Connecting to Redis at ${host}:${String(port)}`,
          'QueueModule',
        );

        return {
          redis: {
            host,
            port,
            password,
            // enableOfflineQueue: false, // Allow offline queue to prevent startup crash
          },
        };
      },
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
