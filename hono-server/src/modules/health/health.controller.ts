import type { Context } from 'hono';
import { healthService } from './health.service.js';
import { formatSuccessResponse } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';

export class HealthController {
  async getHealth(c: Context) {
    const health = await healthService.checkHealth();
    return c.json(
      formatSuccessResponse(health, 'Health check passed', HTTP_STATUS.OK),
      HTTP_STATUS.OK,
    );
  }

  getLiveness(c: Context) {
    const liveness = healthService.checkLiveness();
    return c.json(liveness, HTTP_STATUS.OK);
  }

  async getReadiness(c: Context) {
    const readiness = await healthService.checkReadiness();
    const statusCode = readiness.status === 'ready' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
    return c.json(readiness, statusCode as any);
  }
}

export const healthController = new HealthController();
