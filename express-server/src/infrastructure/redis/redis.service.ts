import { getRedisClient } from './redis.client.js';
import { logger } from '../../services/logger.service.js';
import type { CacheSetOptions, RateLimitResult } from './redis.types.js';

export class RedisService {
  async connect(): Promise<void> {
    try {
      const client = getRedisClient();
      if (client.status === 'wait' || client.status === 'close') {
        await client.connect();
      }
    } catch (err) {
      logger.error({ err }, 'Failed to initiate Redis connection during startup');
    }
  }

  async disconnect(): Promise<void> {
    try {
      const client = getRedisClient();
      if (client.status !== 'end') {
        await client.quit();
        logger.info('Redis connection gracefully closed');
      }
    } catch (err) {
      logger.error({ err }, 'Error closing Redis connection');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const client = getRedisClient();
      const response = await client.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  async ping(): Promise<{ healthy: boolean; latencyMs: number }> {
    const startTime = Date.now();
    try {
      const client = getRedisClient();
      const res = await client.ping();
      const latencyMs = Date.now() - startTime;
      return { healthy: res === 'PONG', latencyMs };
    } catch {
      return { healthy: false, latencyMs: -1 };
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      logger.warn({ err, key }, 'Redis get error; falling back to null');
      return null;
    }
  }

  async set(key: string, value: unknown, options?: CacheSetOptions): Promise<boolean> {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);
      if (options?.ttlSeconds && options.ttlSeconds > 0) {
        await client.set(key, serialized, 'EX', options.ttlSeconds);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch (err) {
      logger.warn({ err, key }, 'Redis set error; continuing without caching');
      return false;
    }
  }

  async del(key: string | string[]): Promise<number> {
    try {
      const client = getRedisClient();
      if (Array.isArray(key)) {
        if (key.length === 0) return 0;
        return await client.del(...key);
      }
      return await client.del(key);
    } catch (err) {
      logger.warn({ err, key }, 'Redis del error');
      return 0;
    }
  }

  async delByPrefix(prefixPattern: string): Promise<number> {
    try {
      const client = getRedisClient();
      let cursor = '0';
      let totalDeleted = 0;
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${prefixPattern}*`, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          // ioredis scan returns keys already including keyPrefix if matched
          // When passing to del on the same client, ioredis automatically handles prefixes
          const deleted = await client.del(...keys);
          totalDeleted += deleted;
        }
      } while (cursor !== '0');
      return totalDeleted;
    } catch (err) {
      logger.warn({ err, prefixPattern }, 'Redis scan & delete by prefix error');
      return 0;
    }
  }

  /**
   * Redis-backed atomic rate limiter using fixed window counter with millisecond precision.
   * Ensures atomic execution via pipeline.
   */
  async consumeRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    try {
      const client = getRedisClient();
      const pipeline = client.pipeline();

      pipeline.incr(key);
      pipeline.pttl(key);

      const results = await pipeline.exec();

      if (!results || results.length < 2) {
        // Fallback if execution fails
        return {
          allowed: true,
          limit,
          remaining: limit,
          resetTimeMs: now + windowMs,
          retryAfterSeconds: 0,
        };
      }

      const incrResult = results[0]?.[1] as number;
      let ttlResult = results[1]?.[1] as number;

      // If new key or no expiry set, set expiration window
      if (ttlResult === -1 || incrResult === 1) {
        await client.pexpire(key, windowMs);
        ttlResult = windowMs;
      }

      const currentCount = incrResult;
      const remaining = Math.max(0, limit - currentCount);
      const allowed = currentCount <= limit;
      const resetTimeMs = now + Math.max(0, ttlResult);
      const retryAfterSeconds = Math.ceil(Math.max(0, ttlResult) / 1000);

      return {
        allowed,
        limit,
        remaining,
        resetTimeMs,
        retryAfterSeconds,
      };
    } catch (err) {
      logger.error({ err, key }, 'Rate limiter Redis execution error; failing open');
      return {
        allowed: true,
        limit,
        remaining: limit,
        resetTimeMs: now + windowMs,
        retryAfterSeconds: 0,
      };
    }
  }
}

export const redisService = new RedisService();

