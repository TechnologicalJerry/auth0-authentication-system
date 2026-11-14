import { appConfig } from '../../config/app.config.js';
import { databaseService } from '../../database/database.service.js';
import { redisService } from '../../infrastructure/redis/redis.service.js';

export interface HealthCheckResult {
  appName: string;
  version: string;
  environment: string;
  status: 'healthy';
  timestamp: string;
}

export interface LivenessResult {
  status: 'live';
  uptimeSeconds: number;
  memoryUsage: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  timestamp: string;
}

export interface ReadinessResult {
  ready: boolean;
  status: 'ready' | 'not_ready';
  components: {
    database: { status: 'healthy' | 'unhealthy' };
    redis: { status: 'healthy' | 'unhealthy' };
  };
  timestamp: string;
}

export interface DependenciesResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  dependencies: {
    database: {
      provider: 'postgresql';
      status: 'healthy' | 'unhealthy';
      latencyMs: number;
    };
    redis: {
      provider: 'redis';
      status: 'healthy' | 'unhealthy';
      latencyMs: number;
    };
    auth0: {
      provider: 'auth0';
      status: 'configured';
      domain: string;
      audience: string;
      note: string;
    };
  };
  timestamp: string;
}

export class HealthService {
  getHealth(): HealthCheckResult {
    return {
      appName: appConfig.env.APP_NAME,
      version: appConfig.env.APP_VERSION,
      environment: appConfig.env.NODE_ENV,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  getLiveness(): LivenessResult {
    const memory = process.memoryUsage();
    return {
      status: 'live',
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsage: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResult> {
    const [dbHealthy, redisHealthy] = await Promise.all([
      databaseService.isHealthy(),
      redisService.isHealthy(),
    ]);

    const ready = dbHealthy; // Database is hard prerequisite for traffic

    return {
      ready,
      status: ready ? 'ready' : 'not_ready',
      components: {
        database: { status: dbHealthy ? 'healthy' : 'unhealthy' },
        redis: { status: redisHealthy ? 'healthy' : 'unhealthy' },
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getDependencies(): Promise<DependenciesResult> {
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
