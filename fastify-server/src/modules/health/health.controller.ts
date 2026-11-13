import type { FastifyRequest, FastifyReply } from 'fastify';
import { healthService } from './health.service.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';

export class HealthController {
  getHealth(_request: FastifyRequest, reply: FastifyReply): void {
    const health = healthService.getBasicHealth();
    sendSuccess(reply, HTTP_STATUS.OK, 'Application is healthy', health);
  }

  getLiveness(_request: FastifyRequest, reply: FastifyReply): void {
    const liveness = healthService.getLiveness();
    sendSuccess(reply, HTTP_STATUS.OK, 'Application is live', liveness);
  }

  async getReadiness(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const readiness = await healthService.getReadiness();
    const statusCode = readiness.ready ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
    sendSuccess(reply, statusCode, readiness.ready ? 'Application is ready' : 'Application is not ready', readiness);
  }
}

export const healthController = new HealthController();

