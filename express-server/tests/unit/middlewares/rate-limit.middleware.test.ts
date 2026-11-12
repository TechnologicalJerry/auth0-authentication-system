import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createRateLimiter } from '../../../src/middlewares/rate-limit.middleware.js';
import { redisService } from '../../../src/infrastructure/redis/redis.service.js';

describe('Distributed Rate Limiting Middleware', () => {
  it('should allow request within quota and append standard IETF headers', async () => {
    vi.spyOn(redisService, 'consumeRateLimit').mockResolvedValueOnce({
      allowed: true,
      limit: 100,
      remaining: 99,
      resetTimeMs: Date.now() + 60000,
      retryAfterSeconds: 0,
    });

    const req = {
      ip: '192.168.1.1',
      originalUrl: '/api/v1/users',
      socket: {},
    } as unknown as Request;

    const headers: Record<string, string> = {};
    const res = {
      setHeader: vi.fn().mockImplementation((name: string, val: string) => {
        headers[name] = val;
      }),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn();

    const limiter = createRateLimiter({
      name: 'test-limiter',
      windowMs: 60000,
      maxRequests: 100,
    });

    await limiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '100');
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '99');
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Reset', expect.any(String));
  });

  it('should reject request with HTTP 429 and Retry-After header when quota is exceeded', async () => {
    vi.spyOn(redisService, 'consumeRateLimit').mockResolvedValueOnce({
      allowed: false,
      limit: 20,
      remaining: 0,
      resetTimeMs: Date.now() + 30000,
      retryAfterSeconds: 30,
    });

    const req = {
      ip: '192.168.1.100',
      originalUrl: '/api/v1/auth/me',
      socket: {},
    } as unknown as Request;

    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn();

    const limiter = createRateLimiter({
      name: 'test-auth',
      windowMs: 60000,
      maxRequests: 20,
    });

    await limiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '30');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }),
      }),
    );
  });
});
