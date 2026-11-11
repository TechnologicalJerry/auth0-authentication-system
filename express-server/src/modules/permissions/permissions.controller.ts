import type { Request, Response } from 'express';
import { permissionsService } from './permissions.service.js';
import { updateRolePermissionsSchema, roleIdParamSchema } from './permissions.schema.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';

export class PermissionsController {
  async getPermissions(_req: Request, res: Response): Promise<void> {
    const permissions = await permissionsService.getPermissions();
    sendSuccess(res, HTTP_STATUS.OK, 'Permissions retrieved successfully', permissions);
  }

  async getRolePermissions(req: Request, res: Response): Promise<void> {
    const paramResult = roleIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const rolePermissions = await permissionsService.getRolePermissions(paramResult.data.id);
    sendSuccess(res, HTTP_STATUS.OK, 'Role permissions retrieved successfully', rolePermissions);
  }

  async updateRolePermissions(req: Request, res: Response): Promise<void> {
    const paramResult = roleIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = updateRolePermissionsSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new AppError('Invalid request payload', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: bodyResult.error.format(),
      });
    }

    const updated = await permissionsService.updateRolePermissions(
      paramResult.data.id,
      bodyResult.data.permissionIds,
    );
    sendSuccess(res, HTTP_STATUS.OK, 'Role permissions updated successfully', updated);
  }
}

export const permissionsController = new PermissionsController();

