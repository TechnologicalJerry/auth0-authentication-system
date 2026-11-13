import { appConfig } from '../../config/app.config.js';
import { databaseService } from '../../database/database.service.js';
import type { BasicHealthResponse, LivenessResponse, ReadinessResponse } from './health.types.js';

export class HealthService {
  getBasicHealth(): BasicHealthResponse {
    return {
      appName: appConfig.server.appName,
      version: '1.0.0',
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
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const isDbHealthy = await databaseService.isHealthy();
    const ready = isDbHealthy;

    return {
      ready,
      status: ready ? 'ready' : 'not_ready',
      components: {
        database: { status: isDbHealthy ? 'healthy' : 'unhealthy' },
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();

