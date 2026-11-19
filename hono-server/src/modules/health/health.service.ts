import { databaseService } from '../../database/database.service.js';
import { appConfig } from '../../config/app.config.js';
import type { HealthStatus, LivenessStatus, ReadinessStatus } from './health.types.js';

export class HealthService {
  private formatBytes(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  async checkHealth(): Promise<HealthStatus> {
    const isDbHealthy = await databaseService.isHealthy();
    return {
      status: isDbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: appConfig.server.isProduction ? 'production' : 'development',
      version: appConfig.server.appVersion,
      appName: appConfig.server.appName,
    };
  }

  checkLiveness(): LivenessStatus {
    const mem = process.memoryUsage();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      memoryUsage: {
        rss: this.formatBytes(mem.rss),
        heapTotal: this.formatBytes(mem.heapTotal),
        heapUsed: this.formatBytes(mem.heapUsed),
        external: this.formatBytes(mem.external),
      },
    };
  }

  async checkReadiness(): Promise<ReadinessStatus> {
    const isDbHealthy = await databaseService.isHealthy();
    return {
      status: isDbHealthy ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      database: isDbHealthy ? 'connected' : 'disconnected',
      uptime: Math.floor(process.uptime()),
    };
  }
}

export const healthService = new HealthService();
