import { appConfig } from '../../config/app.config.js';
import { databaseService } from '../../database/database.service.js';
import { redisService } from '../../infrastructure/redis/redis.service.js';
import type {
  BasicHealthResponse,
  LivenessResponse,
  ReadinessResponse,
  DependenciesResponse,
} from './health.types.js';

export class HealthService {
  getBasicHealth(): BasicHealthResponse {
    return {
      appName: appConfig.server.appName,
      version: appConfig.server.appVersion,
      environment: appConfig.env.NODE_ENV,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  getLiveness(): LivenessResponse {
    const memory = process.memoryUsage();
    return {
      status: 'live',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMb: Math.round((memory.rss / (1024 * 1024)) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / (1024 * 1024)) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const [isDbHealthy, isRedisHealthy] = await Promise.all([
      databaseService.isHealthy(),
      redisService.isHealthy(),
    ]);

    const ready = isDbHealthy; // Database is hard prerequisite for traffic

    return {
      ready,
      status: ready ? 'ready' : 'not_ready',
      components: {
        database: { status: isDbHealthy ? 'healthy' : 'unhealthy' },
        redis: { status: isRedisHealthy ? 'healthy' : 'unhealthy' },
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getDependencies(): Promise<DependenciesResponse> {
    const [dbPing, redisPing] = await Promise.all([
      databaseService.ping(),
      redisService.ping(),
    ]);

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!dbPing.healthy) {
      overallStatus = 'unhealthy';
    } else if (!redisPing.healthy) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      dependencies: {
        database: {
          provider: 'postgresql',
          status: dbPing.healthy ? 'healthy' : 'unhealthy',
          latencyMs: dbPing.latencyMs,
        },
        redis: {
          provider: 'redis',
          status: redisPing.healthy ? 'healthy' : 'unhealthy',
          latencyMs: redisPing.latencyMs,
        },
        auth0: {
          provider: 'auth0',
          status: 'configured',
          domain: appConfig.auth0.domain,
          audience: appConfig.auth0.audience,
          note: 'Local JWT validation and JWKS caching ready; external Auth0 status verified via bearer token verification at runtime',
        },
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
