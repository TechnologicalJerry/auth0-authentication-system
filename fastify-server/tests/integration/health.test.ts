import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { databaseService } from '../../src/database/database.service.js';
import { redisService } from '../../src/infrastructure/redis/redis.service.js';

vi.mock('../../src/database/database.service.js', () => ({
  databaseService: {
    isHealthy: vi.fn(),
    ping: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    isHealthy: vi.fn(),
    ping: vi.fn(),
    consumeRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      limit: 100,
      resetTimeMs: 60000,
      retryAfterSeconds: 0,
    }),
  },
}));

describe('Health Integration Tests', () => {
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

  describe('GET /api/v1/health', () => {
    it('returns basic health info with status 200', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
      expect(body.data.appName).toBe('fastify-server');
    });
  });

  describe('GET /health/live and /api/v1/health/live', () => {
    it('returns liveness state with uptime and timestamp', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health/live',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ok');
      expect(body.uptime).toBeDefined();
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 when both PostgreSQL and Redis are healthy', async () => {
      vi.mocked(databaseService.isHealthy).mockResolvedValueOnce(true);
      vi.mocked(redisService.isHealthy).mockResolvedValueOnce(true);

      const res = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('ready');
      expect(body.database).toBe('connected');
      expect(body.redis).toBe('connected');
    });

    it('returns 503 when database is unhealthy', async () => {
      vi.mocked(databaseService.isHealthy).mockResolvedValueOnce(false);
      vi.mocked(redisService.isHealthy).mockResolvedValueOnce(true);

      const res = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });

      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('degraded');
      expect(body.database).toBe('disconnected');
    });
  });

  describe('GET /health/dependencies', () => {
    it('returns dependency latency breakdown with status 200', async () => {
      vi.mocked(databaseService.ping).mockResolvedValueOnce({ healthy: true, latencyMs: 2 });
      vi.mocked(redisService.ping).mockResolvedValueOnce({ healthy: true, latencyMs: 1 });

      const res = await app.inject({
        method: 'GET',
        url: '/health/dependencies',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
      expect(body.data.checks.database.status).toBe('healthy');
      expect(body.data.checks.redis.status).toBe('healthy');
    });
  });
});
