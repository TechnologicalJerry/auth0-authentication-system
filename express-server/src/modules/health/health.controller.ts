import type { Request, Response } from 'express';
import { healthService } from './health.service.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';

export class HealthController {
  getHealth(_req: Request, res: Response): void {
    const health = healthService.getHealth();
    sendSuccess(res, HTTP_STATUS.OK, 'Service is healthy', health);
  }
}

export const healthController = new HealthController();
