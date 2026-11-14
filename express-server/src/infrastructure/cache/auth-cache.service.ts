import { redisService } from '../redis/redis.service.js';
import { REDIS_KEYS } from '../redis/redis.constants.js';
import { appConfig } from '../../config/app.config.js';
import { usersRepository } from '../../modules/users/users.repository.js';
import { logger } from '../../services/logger.service.js';
import type { CurrentUserContext } from '../../modules/users/users.types.js';

export class AuthCacheService {
  private getUserKey(auth0UserId: string): string {
    return `${REDIS_KEYS.AUTH_USER_PREFIX}${auth0UserId}`;
  }

  /**
   * Retrieves user authorization context with Redis caching.
   * If Redis is unavailable or on cache miss, safely queries PostgreSQL and updates cache.
   */
  async getUserContext(auth0UserId: string): Promise<CurrentUserContext | null> {
    const key = this.getUserKey(auth0UserId);

    // Try reading from cache
    const cached = await redisService.get<CurrentUserContext>(key);
    if (cached) {
      logger.debug({ auth0UserId }, 'Auth cache hit for user context');
      return cached;
    }

    logger.debug({ auth0UserId }, 'Auth cache miss; querying database');
    const userContext = await usersRepository.getUserContext(auth0UserId);

    if (userContext) {
      // Store in Redis with TTL
      await redisService.set(key, userContext, {
        ttlSeconds: appConfig.cache.authTtlSeconds,
      });
    }

    return userContext;
  }

  /**
   * Invalidates cached authorization context for a single user.
   */
  async invalidateUser(auth0UserId: string): Promise<void> {
    const key = this.getUserKey(auth0UserId);
    await redisService.del(key);
    logger.debug({ auth0UserId }, 'Invalidated auth cache for user');
  }

  /**
   * Invalidates multiple users' cached authorization context.
   */
  async invalidateUsers(auth0UserIds: string[]): Promise<void> {
    if (auth0UserIds.length === 0) return;
    const keys = auth0UserIds.map((id) => this.getUserKey(id));
    await redisService.del(keys);
    logger.debug({ count: auth0UserIds.length }, 'Invalidated auth cache for multiple users');
  }

  /**
   * Invalidates all authorization caches (e.g. after global role-permission changes).
   */
  async invalidateAll(): Promise<void> {
    await redisService.delByPrefix(REDIS_KEYS.AUTH_USER_PREFIX);
    logger.info('Invalidated all cached user authorization contexts');
  }
}

export const authCacheService = new AuthCacheService();

