import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { databaseService } from '../../src/database/database.service.js';
import { redisService } from '../../src/infrastructure/redis/redis.service.js';

vi.mock('../../src/database/database.service.js', () => ({
  databaseService: {
    isHealthy: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    isHealthy: vi.fn(),
    consumeToken: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetMs: 60000,
      totalLimit: 100,
    }),
  },
}));

describe('Health Integration Tests', () => {
  const app = getTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/health', () => {
    it('returns basic health info with status 200', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        appName: 'express-server',
        status: 'healthy',
      });
      expect(res.body.data.timestamp).toBeDefined();
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('returns liveness state with uptime and memory usage', async () => {
      const res = await request(app).get('/api/v1/health/live');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('live');
      expect(typeof res.body.data.uptimeSeconds).toBe('number');
      expect(res.body.data.memoryUsage).toHaveProperty('rssMb');
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('returns 200 OK when both PostgreSQL and Redis are healthy', async () => {
      vi.mocked(databaseService.isHealthy).mockResolvedValue(true);
      vi.mocked(redisService.isHealthy).mockResolvedValue(true);

      const res = await request(app).get('/api/v1/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ready).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.components.database.status).toBe('healthy');
      expect(res.body.data.components.redis.status).toBe('healthy');
    });

    it('returns 503 Service Unavailable when database is unhealthy', async () => {
      vi.mocked(databaseService.isHealthy).mockResolvedValue(false);
      vi.mocked(redisService.isHealthy).mockResolvedValue(true);

      const res = await request(app).get('/api/v1/health/ready');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.ready).toBe(false);
      expect(res.body.data.status).toBe('not_ready');
      expect(res.body.data.components.database.status).toBe('unhealthy');
    });
  });

  describe('GET /api/v1/health/dependencies', () => {
    it('returns dependency latency details', async () => {
      vi.mocked(databaseService.isHealthy).mockResolvedValue(true);
      vi.mocked(redisService.isHealthy).mockResolvedValue(true);

      const res = await request(app).get('/api/v1/health/dependencies');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.dependencies.database.provider).toBe('postgresql');
      expect(res.body.data.dependencies.redis.provider).toBe('redis');
      expect(res.body.data.dependencies.auth0.provider).toBe('auth0');
    });
  });
});
