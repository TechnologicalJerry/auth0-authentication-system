import type { Request, Response } from 'express';
import { healthService } from './health.service.js';
import { sendSuccess, sendError } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';

export class HealthController {
  getHealth(_req: Request, res: Response): void {
    const health = healthService.getHealth();
    sendSuccess(res, HTTP_STATUS.OK, 'Service is healthy', health);
  }

  getLiveness(_req: Request, res: Response): void {
    const liveness = healthService.getLiveness();
    sendSuccess(res, HTTP_STATUS.OK, 'Service is live', liveness);
  }

  async getReadiness(_req: Request, res: Response): Promise<void> {
    const readiness = await healthService.getReadiness();

    if (!readiness.ready) {
      sendError(
        res,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        'Service is not ready to accept traffic',
        ErrorCode.DATABASE_ERROR,
        readiness,
      );
      return;
    }

    sendSuccess(res, HTTP_STATUS.OK, 'Service is ready', readiness);
  }

  async getDependencies(_req: Request, res: Response): Promise<void> {
    const dependencies = await healthService.getDependencies();

    if (dependencies.status === 'unhealthy') {
      sendError(
        res,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        'Critical dependencies are unhealthy',
        ErrorCode.DATABASE_ERROR,
        dependencies,
      );
      return;
    }

    sendSuccess(res, HTTP_STATUS.OK, 'Dependency status retrieved', dependencies);
  }
}

export const healthController = new HealthController();
