import type { Request, Response } from 'express';
import { adminService } from './admin.service.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';

export class AdminController {
  async getDashboard(_req: Request, res: Response): Promise<void> {
    const stats = await adminService.getDashboardStatistics();
    sendSuccess(res, HTTP_STATUS.OK, 'Admin dashboard statistics retrieved successfully', stats);
  }

  async getUserStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await adminService.getUserStatistics();
    sendSuccess(res, HTTP_STATUS.OK, 'User statistics retrieved successfully', stats);
  }

  async getRoleStatistics(_req: Request, res: Response): Promise<void> {
    const stats = await adminService.getRoleStatistics();
    sendSuccess(res, HTTP_STATUS.OK, 'Role statistics retrieved successfully', stats);
  }
}

export const adminController = new AdminController();

