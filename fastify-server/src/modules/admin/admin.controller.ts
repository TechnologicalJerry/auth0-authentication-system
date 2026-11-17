import type { FastifyRequest, FastifyReply } from 'fastify';
import { adminService } from './admin.service.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';

export class AdminController {
  async getDashboard(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const stats = await adminService.getDashboardStatistics();
    sendSuccess(reply, HTTP_STATUS.OK, 'Admin dashboard statistics retrieved', stats);
  }

  async getUserStatistics(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const stats = await adminService.getUserStatistics();
    sendSuccess(reply, HTTP_STATUS.OK, 'User statistics retrieved', stats);
  }

  async getRoleStatistics(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const stats = await adminService.getRoleStatistics();
    sendSuccess(reply, HTTP_STATUS.OK, 'Role statistics retrieved', stats);
  }
}

export const adminController = new AdminController();
