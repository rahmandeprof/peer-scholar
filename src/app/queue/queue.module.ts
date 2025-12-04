import { BullModule } from '@nestjs/bull';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
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
            username: configService.get<string>('REDIS_USERNAME'),
            password,
            // enableOfflineQueue: false, // Allow offline queue to prevent startup crash
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [BullModule],
})
export class QueueModule {}
