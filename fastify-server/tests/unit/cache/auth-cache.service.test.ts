import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authCacheService } from '../../../src/infrastructure/cache/auth-cache.service.js';
import { redisService } from '../../../src/infrastructure/redis/redis.service.js';
import { usersRepository } from '../../../src/modules/users/users.repository.js';
import { REDIS_KEYS } from '../../../src/infrastructure/redis/redis.constants.js';

vi.mock('../../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    delByPrefix: vi.fn(),
  },
}));

vi.mock('../../../src/modules/users/users.repository.js', () => ({
  usersRepository: {
    getUserContext: vi.fn(),
  },
}));

vi.mock('../../../src/services/logger.service.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AuthCacheService', () => {
  const auth0Id = 'auth0|test-user-123';
  const expectedKey = `${REDIS_KEYS.AUTH_USER_PREFIX}${auth0Id}`;
  const mockUserContext = {
    id: 'user-db-123',
    auth0UserId: auth0Id,
    email: 'user@example.com',
    status: 'ACTIVE',
    isActive: true,
    roles: ['USER'],
    permissions: ['users:read'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserContext', () => {
    it('returns cached user context on cache hit without querying DB', async () => {
      vi.mocked(redisService.get).mockResolvedValue(mockUserContext);

      const result = await authCacheService.getUserContext(auth0Id);

      expect(redisService.get).toHaveBeenCalledWith(expectedKey);
      expect(usersRepository.getUserContext).not.toHaveBeenCalled();
      expect(result).toEqual(mockUserContext);
    });

    it('queries DB and caches result on cache miss', async () => {
      vi.mocked(redisService.get).mockResolvedValue(null);
      vi.mocked(usersRepository.getUserContext).mockResolvedValue(mockUserContext as any);

      const result = await authCacheService.getUserContext(auth0Id);

      expect(redisService.get).toHaveBeenCalledWith(expectedKey);
      expect(usersRepository.getUserContext).toHaveBeenCalledWith(auth0Id);
      expect(redisService.set).toHaveBeenCalledWith(
        expectedKey,
        mockUserContext,
        expect.objectContaining({ ttlSeconds: expect.any(Number) }),
      );
      expect(result).toEqual(mockUserContext);
    });
  });

  describe('invalidation methods', () => {
    it('invalidates single user cache key', async () => {
      await authCacheService.invalidateUser(auth0Id);
      expect(redisService.del).toHaveBeenCalledWith(expectedKey);
    });

    it('invalidates multiple users cache keys', async () => {
      const ids = ['auth0|1', 'auth0|2'];
      await authCacheService.invalidateUsers(ids);
      expect(redisService.del).toHaveBeenCalledWith([
        `${REDIS_KEYS.AUTH_USER_PREFIX}auth0|1`,
        `${REDIS_KEYS.AUTH_USER_PREFIX}auth0|2`,
      ]);
    });

    it('invalidates all cache keys using pattern', async () => {
      await authCacheService.invalidateAll();
      expect(redisService.delByPrefix).toHaveBeenCalledWith(REDIS_KEYS.AUTH_USER_PREFIX);
    });
  });
});
