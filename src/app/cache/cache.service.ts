import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis-based cache service for API response caching.
 * Falls back to in-memory storage if Redis is unavailable.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
    private readonly logger = new Logger(CacheService.name);
    private redis: Redis | null = null;
    private useRedis = false;
    private memoryCache = new Map<string, { value: string; expiresAt: number }>();

    constructor(private configService: ConfigService) {
        this.initRedis();
    }

    private initRedis() {
        const host = this.configService.get<string>('REDIS_HOST');
        const port = this.configService.get<number>('REDIS_PORT') ?? 6379;
        const password = this.configService.get<string>('REDIS_PASSWORD');
        const username = this.configService.get<string>('REDIS_USERNAME');

        if (!host) {
            this.logger.warn('REDIS_HOST not configured, using in-memory cache fallback');
            return;
        }

        try {
            this.redis = new Redis({
                host,
                port,
                password,
                username,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                retryStrategy: (times) => {
                    if (times > 3) {
                        this.logger.warn('Redis connection failed after 3 retries, falling back to in-memory');
                        this.useRedis = false;
                        return null;
                    }
                    return Math.min(times * 100, 3000);
                },
            });

            this.redis.on('connect', () => {
                this.logger.log('Redis cache connected');
                this.useRedis = true;
            });

            this.redis.on('error', (err) => {
                this.logger.error('Redis cache error:', err.message);
                this.useRedis = false;
            });

            // Connect async
            void this.redis.connect().catch(() => {
                this.logger.warn('Redis connection failed, using in-memory fallback');
            });
        } catch (err) {
            this.logger.error('Failed to initialize Redis cache:', err);
        }
    }

    async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit();
        }
    }

    /**
     * Get a cached value
     */
    async get<T>(key: string): Promise<T | null> {
        const prefixedKey = `cache:${key}`;

        if (this.useRedis && this.redis) {
            try {
                const value = await this.redis.get(prefixedKey);
                if (value) {
                    return JSON.parse(value) as T;
                }
                return null;
            } catch (err) {
                this.logger.error('Redis GET failed, using fallback:', err);
            }
        }

        // Fallback to memory cache
        const cached = this.memoryCache.get(prefixedKey);
        if (cached && cached.expiresAt > Date.now()) {
            return JSON.parse(cached.value) as T;
        }

        // Clean up expired entry
        if (cached) {
            this.memoryCache.delete(prefixedKey);
        }

        return null;
    }

    /**
     * Set a cached value with TTL in seconds
     */
    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        const prefixedKey = `cache:${key}`;
        const stringValue = JSON.stringify(value);

        if (this.useRedis && this.redis) {
            try {
                await this.redis.setex(prefixedKey, ttlSeconds, stringValue);
                return;
            } catch (err) {
                this.logger.error('Redis SETEX failed, using fallback:', err);
            }
        }

        // Fallback to memory cache
        this.memoryCache.set(prefixedKey, {
            value: stringValue,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    /**
     * Delete a cached value
     */
    async delete(key: string): Promise<void> {
        const prefixedKey = `cache:${key}`;

        if (this.useRedis && this.redis) {
            try {
                await this.redis.del(prefixedKey);
            } catch (err) {
                this.logger.error('Redis DEL failed:', err);
            }
        }

        this.memoryCache.delete(prefixedKey);
    }

    /**
     * Delete all cached values matching a pattern
     */
    async invalidatePattern(pattern: string): Promise<void> {
        const prefixedPattern = `cache:${pattern}`;

        if (this.useRedis && this.redis) {
            try {
                const keys = await this.redis.keys(prefixedPattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    this.logger.log(`Invalidated ${keys.length} cache keys matching ${pattern}`);
                }
            } catch (err) {
                this.logger.error('Redis pattern invalidation failed:', err);
            }
        }

        // Also clear matching keys in memory cache
        const regex = new RegExp(prefixedPattern.replace(/\*/g, '.*'));
        for (const key of this.memoryCache.keys()) {
            if (regex.test(key)) {
                this.memoryCache.delete(key);
            }
        }
    }

    /**
     * Get or set a cached value (cache-aside pattern)
     */
    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds: number,
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const value = await fetcher();
        await this.set(key, value, ttlSeconds);
        return value;
    }

    /**
     * Check if cache is using Redis or fallback
     */
    isUsingRedis(): boolean {
        return this.useRedis;
    }

    /**
     * Get cache statistics (for admin dashboard)
     */
    getStats(): { type: string; memoryEntries: number } {
        return {
            type: this.useRedis ? 'redis' : 'memory',
            memoryEntries: this.memoryCache.size,
        };
    }
}
