import { appConfig } from '../../config/app.config.js';

export interface HealthCheckResult {
  appName: string;
  version: string;
  environment: string;
  status: 'healthy';
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
}

export const healthService = new HealthService();
