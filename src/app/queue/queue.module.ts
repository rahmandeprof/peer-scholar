import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { MaterialProcessor } from '../academic/processors/material.processor';

@Module({
  imports: [
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
