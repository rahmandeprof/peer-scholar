import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import Redis from 'ioredis';

export interface ChallengeScore {
  score: number;
  timeTaken: number;
}

/**
 * Redis-based cache service for challenge scores.
 * Falls back to in-memory storage if Redis is unavailable.
 */
@Injectable()
export class ChallengeCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ChallengeCacheService.name);
  private redis: Redis | null = null;
  private inMemoryFallback = new Map<string, Record<string, ChallengeScore>>();
  private useRedis = false;

  constructor(private readonly configService: ConfigService) {
    this.initRedis();
  }

  private initRedis() {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT') ?? 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const username = this.configService.get<string>('REDIS_USERNAME');

    if (!host) {
      this.logger.warn(
        'REDIS_HOST not configured, using in-memory fallback for challenge scores',
      );

      return;
    }

    try {
      this.redis = new Redis({
        host,
        port,
        password,
        username,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(
              'Redis connection failed, falling back to in-memory',
            );
            this.useRedis = false;

            return null;
          }

          return Math.min(times * 100, 2000);
        },
      });

      this.redis.on('connect', () => {
        this.logger.log('Redis connected for challenge scores');
        this.useRedis = true;
      });

      this.redis.on('error', (err) => {
        this.logger.error('Redis error:', err.message);
        this.useRedis = false;
      });
    } catch (err) {
      this.logger.error('Failed to initialize Redis:', err);
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Set a user's score for a challenge
   */
  async setScore(
    challengeId: string,
    userId: string,
    score: ChallengeScore,
  ): Promise<void> {
    const key = `challenge:${challengeId}`;
    const field = `user:${userId}`;
    const value = JSON.stringify(score);

    if (this.useRedis && this.redis) {
      try {
        await this.redis.hset(key, field, value);
        // Set expiry of 1 hour for cleanup
        await this.redis.expire(key, 3600);
      } catch (err) {
        this.logger.error('Redis HSET failed, using fallback:', err);
        this.setScoreInMemory(challengeId, userId, score);
      }
    } else {
      this.setScoreInMemory(challengeId, userId, score);
    }
  }

  private setScoreInMemory(
    challengeId: string,
    userId: string,
    score: ChallengeScore,
  ) {
    if (!this.inMemoryFallback.has(challengeId)) {
      this.inMemoryFallback.set(challengeId, {});
    }
    const scores = this.inMemoryFallback.get(challengeId)!;

    scores[userId] = score;
  }

  /**
   * Get all scores for a challenge
   */
  async getScores(
    challengeId: string,
  ): Promise<Record<string, ChallengeScore> | null> {
    const key = `challenge:${challengeId}`;

    if (this.useRedis && this.redis) {
      try {
        const data = await this.redis.hgetall(key);

        if (!data || Object.keys(data).length === 0) {
          return null;
        }
        const scores: Record<string, ChallengeScore> = {};

        for (const [field, value] of Object.entries(data)) {
          const userId = field.replace('user:', '');

          scores[userId] = JSON.parse(value);
        }

        return scores;
      } catch (err) {
        this.logger.error('Redis HGETALL failed, using fallback:', err);

        return this.inMemoryFallback.get(challengeId) ?? null;
      }
    } else {
      return this.inMemoryFallback.get(challengeId) ?? null;
    }
  }

  /**
   * Get the count of scores for a challenge
   */
  async getScoreCount(challengeId: string): Promise<number> {
    const scores = await this.getScores(challengeId);

    return scores ? Object.keys(scores).length : 0;
  }

  /**
   * Delete a challenge's scores (cleanup)
   */
  async deleteChallenge(challengeId: string): Promise<void> {
    const key = `challenge:${challengeId}`;

    if (this.useRedis && this.redis) {
      try {
        await this.redis.del(key);
      } catch (err) {
        this.logger.error('Redis DEL failed:', err);
      }
    }
    this.inMemoryFallback.delete(challengeId);
  }
}
