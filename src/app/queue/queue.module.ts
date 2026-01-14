import { BullModule } from '@nestjs/bull';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Separate Redis clients for each Bull connection type
// Bull REQUIRES separate connections to prevent lock conflicts:
// - client: regular Redis operations
// - subscriber: pub/sub notifications  
// - bclient: blocking operations (BLPOP) - MUST be separate or locks expire
let sharedRedisClient: Redis | null = null;
let sharedSubscriberClient: Redis | null = null;
let sharedBClient: Redis | null = null;
const logger = new Logger('QueueModule');

function createRedisOptions(configService: ConfigService) {
  return {
    host: configService.get<string>('REDIS_HOST') ?? 'localhost',
    port: configService.get<number>('REDIS_PORT') ?? 6379,
    username: configService.get<string>('REDIS_USERNAME'),
    password: configService.get<string>('REDIS_PASSWORD'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

function createRedisClient(configService: ConfigService, type: 'client' | 'subscriber' | 'bclient'): Redis {
  const options = createRedisOptions(configService);

  // Subscriber - separate connection for pub/sub
  if (type === 'subscriber') {
    if (!sharedSubscriberClient) {
      logger.log(`📡 Creating subscriber Redis client`);
      sharedSubscriberClient = new Redis(options);
      sharedSubscriberClient.on('ready', () => {
        logger.log('✅ Subscriber Redis connection ready');
      });
      sharedSubscriberClient.on('error', (error) => {
        logger.error(`Subscriber Redis error: ${error.message}`);
      });
    }
    return sharedSubscriberClient;
  }

  // BClient - MUST be separate for blocking operations (BLPOP)
  // Sharing this with 'client' causes "Missing lock for job" errors
  if (type === 'bclient') {
    if (!sharedBClient) {
      logger.log(`🔒 Creating bclient Redis client (for blocking operations)`);
      sharedBClient = new Redis(options);
      sharedBClient.on('ready', () => {
        logger.log('✅ BClient Redis connection ready');
      });
      sharedBClient.on('error', (error) => {
        logger.error(`BClient Redis error: ${error.message}`);
      });
    }
    return sharedBClient;
  }

  // Regular client for standard operations
  if (!sharedRedisClient) {
    logger.log(`🔌 Creating main Redis client`);
    sharedRedisClient = new Redis(options);
    sharedRedisClient.on('ready', () => {
      logger.log('✅ Main Redis connection ready');
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

        logger.log(`🚀 Connecting to Redis at ${host}:${String(port)} with 3 separate connections`);

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

