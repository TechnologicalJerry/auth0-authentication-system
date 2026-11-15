import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { redisService } from '../../src/infrastructure/redis/redis.service.js';

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    consumeToken: vi.fn(),
    isHealthy: vi.fn().mockResolvedValue(true),
  },
}));

describe('Security: Distributed Rate Limiting & DoS Defense', () => {
  const app = getTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows request when within rate limit quota', async () => {
    vi.mocked(redisService.consumeToken).mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetMs: 58000,
      totalLimit: 100,
    });

    const res = await request(app).get('/api/v1/auth/status');

    expect(res.status).toBe(200);
    expect(res.headers['ratelimit-limit']).toBe('100');
    expect(res.headers['ratelimit-remaining']).toBe('99');
    expect(res.headers['ratelimit-reset']).toBe('58');
  });

  it('rejects with 429 Too Many Requests when rate limit quota is exhausted', async () => {
    vi.mocked(redisService.consumeToken).mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetMs: 45000,
      totalLimit: 100,
    });

    const res = await request(app).get('/api/v1/auth/status');

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(res.headers['ratelimit-limit']).toBe('100');
    expect(res.headers['ratelimit-remaining']).toBe('0');
    expect(res.headers['ratelimit-reset']).toBe('45');
    expect(res.headers['retry-after']).toBe('45');
  });
});

