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
      vi.mocked(redisService.set).mockResolvedValue(true);

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

    it('returns null and does not cache when user is not found in DB', async () => {
      vi.mocked(redisService.get).mockResolvedValue(null);
      vi.mocked(usersRepository.getUserContext).mockResolvedValue(null);

      const result = await authCacheService.getUserContext(auth0Id);

      expect(result).toBeNull();
      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe('invalidateUser', () => {
    it('deletes specific user key from Redis', async () => {
      vi.mocked(redisService.del).mockResolvedValue(1);

      await authCacheService.invalidateUser(auth0Id);

      expect(redisService.del).toHaveBeenCalledWith(expectedKey);
    });
  });

  describe('invalidateUsers', () => {
    it('deletes multiple user keys from Redis', async () => {
      vi.mocked(redisService.del).mockResolvedValue(2);

      await authCacheService.invalidateUsers(['auth0|user1', 'auth0|user2']);

      expect(redisService.del).toHaveBeenCalledWith([
        `${REDIS_KEYS.AUTH_USER_PREFIX}auth0|user1`,
        `${REDIS_KEYS.AUTH_USER_PREFIX}auth0|user2`,
      ]);
    });

    it('does nothing when passed empty array', async () => {
      await authCacheService.invalidateUsers([]);
      expect(redisService.del).not.toHaveBeenCalled();
    });
  });

  describe('invalidateAll', () => {
    it('deletes all keys with auth user prefix', async () => {
      vi.mocked(redisService.delByPrefix).mockResolvedValue(5);

      await authCacheService.invalidateAll();

      expect(redisService.delByPrefix).toHaveBeenCalledWith(REDIS_KEYS.AUTH_USER_PREFIX);
    });
  });
});
