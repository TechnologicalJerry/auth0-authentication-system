import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { redisService } from '../../src/infrastructure/redis/redis.service.js';

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    consumeRateLimit: vi.fn(),
    isHealthy: vi.fn().mockResolvedValue(true),
  },
}));

describe('Security: Distributed Rate Limiting & DoS Defense', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows request when within rate limit quota and emits standard headers', async () => {
    vi.mocked(redisService.consumeRateLimit).mockResolvedValueOnce({
      allowed: true,
      remaining: 99,
      resetTimeMs: 58000,
      limit: 100,
      retryAfterSeconds: 0,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/status',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['ratelimit-limit']).toBe('100');
    expect(res.headers['ratelimit-remaining']).toBe('99');
    expect(res.headers['ratelimit-reset']).toBe('58');
  });

  it('rejects with 429 Too Many Requests when rate limit quota is exhausted', async () => {
    vi.mocked(redisService.consumeRateLimit).mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTimeMs: 45000,
      limit: 100,
      retryAfterSeconds: 45,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/status',
    });

    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(res.headers['ratelimit-limit']).toBe('100');
    expect(res.headers['ratelimit-remaining']).toBe('0');
    expect(res.headers['ratelimit-reset']).toBe('45');
    expect(res.headers['retry-after']).toBe('45');
  });
});
