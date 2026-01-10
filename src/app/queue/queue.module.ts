import { BullModule } from '@nestjs/bull';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Shared Redis client for connection pooling
let sharedRedisClient: Redis | null = null;
let sharedSubscriberClient: Redis | null = null;

function createRedisClient(configService: ConfigService, type: 'client' | 'subscriber' | 'bclient'): Redis {
  const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
  const port = configService.get<number>('REDIS_PORT') ?? 6379;
  const password = configService.get<string>('REDIS_PASSWORD');
  const username = configService.get<string>('REDIS_USERNAME');

  // For subscriber connections, we need separate instances
  // For client connections, we can reuse
  if (type === 'subscriber') {
    if (!sharedSubscriberClient) {
      Logger.log(`[QueueModule] Creating shared subscriber Redis client`, 'QueueModule');
      sharedSubscriberClient = new Redis({
        host,
        port,
        username,
        password,
        maxRetriesPerRequest: null, // Required for Bull
        enableReadyCheck: false,
      });
    }
    return sharedSubscriberClient;
  }

  // Client and bclient can share a connection
  if (!sharedRedisClient) {
    Logger.log(`[QueueModule] Creating shared Redis client`, 'QueueModule');
    sharedRedisClient = new Redis({
      host,
      port,
      username,
      password,
      maxRetriesPerRequest: null, // Required for Bull
      enableReadyCheck: false,
    });
  }
  return sharedRedisClient;
}

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
        const port = configService.get<number>('REDIS_PORT') ?? 6379;

        Logger.log(
          `[QueueModule] Connecting to Redis at ${host}:${String(port)} with connection sharing`,
          'QueueModule',
        );

        return {
          // Use createClient for connection reuse
          createClient: (type) => createRedisClient(configService, type),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [BullModule],
})
export class QueueModule implements OnModuleInit {
  private readonly logger = new Logger(QueueModule.name);

  onModuleInit() {
    // Connection check is now handled by shared client
    if (sharedRedisClient) {
      sharedRedisClient.on('ready', () => {
        this.logger.log('✅ Shared Redis connection established successfully');
      });

      sharedRedisClient.on('error', (error) => {
        this.logger.error(`❌ Redis connection error: ${error.message}`);
      });
    }
  }
}
