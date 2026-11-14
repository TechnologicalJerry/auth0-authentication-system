import type { Request, Response } from 'express';
import { rolesService } from './roles.service.js';
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
  assignRoleSchema,
  userRoleParamSchema,
} from './roles.schema.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';

export class RolesController {
  async getRoles(_req: Request, res: Response): Promise<void> {
    const roles = await rolesService.getRoles();
    sendSuccess(res, HTTP_STATUS.OK, 'Roles retrieved successfully', roles);
  }

  async getRoleById(req: Request, res: Response): Promise<void> {
    const paramResult = roleIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const role = await rolesService.getRoleById(paramResult.data.id);
    sendSuccess(res, HTTP_STATUS.OK, 'Role retrieved successfully', role);
  }

  async createRole(req: Request, res: Response): Promise<void> {
    const bodyResult = createRoleSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new AppError('Invalid request payload', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: bodyResult.error.format(),
      });
    }

    const created = await rolesService.createRole(bodyResult.data, req.currentUser?.id);
    sendSuccess(res, HTTP_STATUS.CREATED, 'Role created successfully', created);
  }

  async updateRole(req: Request, res: Response): Promise<void> {
    const paramResult = roleIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = updateRoleSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new AppError('Invalid request payload', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: bodyResult.error.format(),
      });
    }

    const updated = await rolesService.updateRole(paramResult.data.id, bodyResult.data, req.currentUser?.id);
    sendSuccess(res, HTTP_STATUS.OK, 'Role updated successfully', updated);
  }

  async deleteRole(req: Request, res: Response): Promise<void> {
    const paramResult = roleIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    await rolesService.deleteRole(paramResult.data.id, req.currentUser?.id);
    sendSuccess(res, HTTP_STATUS.OK, 'Role deleted successfully', null);
  }

  async assignRoleToUser(req: Request, res: Response): Promise<void> {
    const paramResult = userRoleParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid user ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = assignRoleSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new AppError('Invalid request payload', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: bodyResult.error.format(),
      });
    }

    const assignment = await rolesService.assignRoleToUser(
      paramResult.data.id,
      bodyResult.data.roleId,
      req.currentUser?.id,
    );
    sendSuccess(res, HTTP_STATUS.CREATED, 'Role assigned to user successfully', assignment);
  }

  async revokeRoleFromUser(req: Request, res: Response): Promise<void> {
    const paramResult = userRoleParamSchema.safeParse(req.params);
    if (!paramResult.success || !paramResult.data.roleId) {
      throw new AppError('Invalid user ID or role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    await rolesService.revokeRoleFromUser(
      paramResult.data.id,
      paramResult.data.roleId,
      req.currentUser?.id,
    );
    sendSuccess(res, HTTP_STATUS.OK, 'Role revoked from user successfully', null);
  }
}

export const rolesController = new RolesController();

