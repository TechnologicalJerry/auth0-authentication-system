import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { createRateLimiter } from '../../../src/plugins/rate-limit.plugin.js';
import { redisService } from '../../../src/infrastructure/redis/redis.service.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';

vi.mock('../../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    consumeRateLimit: vi.fn(),
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

describe('rate-limit.plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows request within limit and sets RateLimit headers', async () => {
    const limiter = createRateLimiter({
      name: 'test',
      windowMs: 60000,
      maxRequests: 10,
    });

    const headers: Record<string, string> = {};
    const req = { ip: '127.0.0.1', url: '/test' } as FastifyRequest;
    const reply = {
      header: vi.fn().mockImplementation((name: string, val: string) => {
        headers[name] = val;
      }),
    } as unknown as FastifyReply;

    vi.mocked(redisService.consumeRateLimit).mockResolvedValueOnce({
      allowed: true,
      remaining: 9,
      limit: 10,
      resetTimeMs: 60000,
      retryAfterSeconds: 0,
    });

    await limiter(req, reply);

    expect(reply.header).toHaveBeenCalledWith('RateLimit-Limit', '10');
    expect(reply.header).toHaveBeenCalledWith('RateLimit-Remaining', '9');
    expect(reply.header).toHaveBeenCalledWith('RateLimit-Reset', '60');
  });

  it('throws RATE_LIMIT_EXCEEDED and sets Retry-After header when quota exceeded', async () => {
    const limiter = createRateLimiter({
      name: 'test',
      windowMs: 60000,
      maxRequests: 10,
    });

    const req = { ip: '127.0.0.1', url: '/test' } as FastifyRequest;
    const reply = {
      header: vi.fn(),
    } as unknown as FastifyReply;

    vi.mocked(redisService.consumeRateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      limit: 10,
      resetTimeMs: 30000,
      retryAfterSeconds: 30,
    });

    await expect(limiter(req, reply)).rejects.toThrowError(
      expect.objectContaining({ code: ErrorCode.RATE_LIMIT_EXCEEDED }),
    );

    expect(reply.header).toHaveBeenCalledWith('Retry-After', '30');
  });
});
