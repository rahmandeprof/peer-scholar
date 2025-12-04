import { BullModule } from '@nestjs/bull';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import Queue from 'bull';

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
export class QueueModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') ?? 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') ?? 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const username = this.configService.get<string>('REDIS_USERNAME');

    const testQueue = new Queue('connection-check', {
      redis: { host, port, password, username },
    });

    testQueue.client.on('ready', () => {
      Logger.log('✅ Redis connection established successfully', 'QueueModule');
      void testQueue.close();
    });

    testQueue.client.on('error', (error) => {
      Logger.error('❌ Redis connection failed', error.stack, 'QueueModule');
      void testQueue.close();
    });
  }
}
