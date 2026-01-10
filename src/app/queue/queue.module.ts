import { BullModule } from '@nestjs/bull';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Shared Redis client for connection pooling
let sharedRedisClient: Redis | null = null;
let sharedSubscriberClient: Redis | null = null;
const logger = new Logger('QueueModule');

function createRedisClient(configService: ConfigService, type: 'client' | 'subscriber' | 'bclient'): Redis {
  const host = configService.get<string>('REDIS_HOST') ?? 'localhost';
  const port = configService.get<number>('REDIS_PORT') ?? 6379;
  const password = configService.get<string>('REDIS_PASSWORD');
  const username = configService.get<string>('REDIS_USERNAME');

  // For subscriber connections, we need separate instances
  if (type === 'subscriber') {
    if (!sharedSubscriberClient) {
      logger.log(`Creating shared subscriber Redis client`);
      sharedSubscriberClient = new Redis({
        host,
        port,
        username,
        password,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      // Add listeners once during creation
      sharedSubscriberClient.on('ready', () => {
        logger.log('✅ Subscriber Redis connection ready');
      });
      sharedSubscriberClient.on('error', (error) => {
        logger.error(`Subscriber Redis error: ${error.message}`);
      });
    }
    return sharedSubscriberClient;
  }

  // Client and bclient share a connection
  if (!sharedRedisClient) {
    logger.log(`Creating shared Redis client`);
    sharedRedisClient = new Redis({
      host,
      port,
      username,
      password,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    // Add listeners once during creation
    sharedRedisClient.on('ready', () => {
      logger.log('✅ Shared Redis connection ready');
    });
    sharedRedisClient.on('error', (error) => {
      logger.error(`Redis error: ${error.message}`);
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

        logger.log(`Connecting to Redis at ${host}:${String(port)} with connection sharing`);

        return {
          createClient: (type) => createRedisClient(configService, type),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [BullModule],
})
export class QueueModule { }
