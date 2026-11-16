import type { FastifyRequest, FastifyReply } from 'fastify';
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
  async getRoles(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const roles = await rolesService.getRoles();
    sendSuccess(reply, HTTP_STATUS.OK, 'Roles retrieved successfully', roles);
  }

  async getRoleById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = roleIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw new AppError('Invalid role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const role = await rolesService.getRoleById(paramResult.data.id);
    sendSuccess(reply, HTTP_STATUS.OK, 'Role retrieved successfully', role);
  }

  async createRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const bodyResult = createRoleSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw new AppError(
        'Invalid request payload',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        bodyResult.error.issues,
      );
    }

    const created = await rolesService.createRole(bodyResult.data);
    sendSuccess(reply, HTTP_STATUS.CREATED, 'Role created successfully', created);
  }

  async updateRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = roleIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw new AppError('Invalid role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = updateRoleSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw new AppError(
        'Invalid request payload',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        bodyResult.error.issues,
      );
    }

    const updated = await rolesService.updateRole(paramResult.data.id, bodyResult.data);
    sendSuccess(reply, HTTP_STATUS.OK, 'Role updated successfully', updated);
  }

  async deleteRole(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = roleIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw new AppError('Invalid role ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    await rolesService.deleteRole(paramResult.data.id);
    sendSuccess(reply, HTTP_STATUS.OK, 'Role deleted successfully', null);
  }

  async assignRoleToUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = userRoleParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw new AppError('Invalid user ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = assignRoleSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw new AppError(
        'Invalid request payload',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        bodyResult.error.issues,
      );
    }

    const assignment = await rolesService.assignRoleToUser(
      paramResult.data.id,
      bodyResult.data.roleId,
    );
    sendSuccess(reply, HTTP_STATUS.CREATED, 'Role assigned to user successfully', assignment);
  }

  async revokeRoleFromUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = userRoleParamSchema.safeParse(request.params);
    if (!paramResult.success || !paramResult.data.roleId) {
      throw new AppError(
        'Invalid user ID or role ID',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
      );
    }

    await rolesService.revokeRoleFromUser(
      paramResult.data.id,
      paramResult.data.roleId,
      request.currentUser?.id,
    );
    sendSuccess(reply, HTTP_STATUS.OK, 'Role revoked from user successfully', null);
  }
}

export const rolesController = new RolesController();
