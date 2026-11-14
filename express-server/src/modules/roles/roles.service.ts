import { rolesRepository } from './roles.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { authCacheService } from '../../infrastructure/cache/auth-cache.service.js';
import { auditLogsService } from '../audit-logs/audit-logs.service.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';
import { SYSTEM_ROLES } from '../../common/constants/roles.constants.js';
import type {
  RoleResponseDto,
  CreateRoleDto,
  UpdateRoleDto,
  UserRoleAssignmentResponseDto,
} from './roles.types.js';

export class RolesService {
  async getRoles(): Promise<RoleResponseDto[]> {
    const roles = await rolesRepository.findAll();
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      permissions: r.permissions,
      userCount: r._count.userRoles,
    }));
  }

  async getRoleById(id: string): Promise<RoleResponseDto> {
    const role = await rolesRepository.findById(id);
    if (!role) {
      throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ErrorCode.ROLE_NOT_FOUND);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
      permissions: role.permissions,
      userCount: role._count.userRoles,
    };
  }

  async createRole(dto: CreateRoleDto, actorUserId?: string): Promise<RoleResponseDto> {
    const existing = await rolesRepository.findByName(dto.name);
    if (existing) {
      throw new AppError(
        `Role with name '${dto.name}' already exists`,
        HTTP_STATUS.CONFLICT,
        ErrorCode.RESOURCE_ALREADY_EXISTS,
      );
    }

    const created = await rolesRepository.create({
      name: dto.name,
      description: dto.description,
      isSystem: false,
      permissionIds: dto.permissionIds,
    });

    await auditLogsService.log({
      actorUserId,
      action: 'ROLE_CREATED',
      resource: 'role',
      resourceId: created.id,
      status: 'SUCCESS',
      metadata: { name: dto.name, description: dto.description },
    });

    return this.getRoleById(created.id);
  }

  async updateRole(id: string, dto: UpdateRoleDto, actorUserId?: string): Promise<RoleResponseDto> {
    const role = await rolesRepository.findById(id);
    if (!role) {
      throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ErrorCode.ROLE_NOT_FOUND);
    }

    // System roles have their names and system status protected
    if (role.isSystem && dto.name && dto.name !== role.name) {
      throw new AppError(
        'System role names cannot be modified',
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.SYSTEM_ROLE_PROTECTED,
      );
    }

    if (dto.name && dto.name !== role.name) {
      const existingWithName = await rolesRepository.findByName(dto.name);
      if (existingWithName) {
        throw new AppError(
          `Role with name '${dto.name}' already exists`,
          HTTP_STATUS.CONFLICT,
          ErrorCode.RESOURCE_ALREADY_EXISTS,
        );
      }
    }

    await rolesRepository.update(id, dto);

    // If role status or details changed, invalidate cached authorization contexts
    await authCacheService.invalidateAll();

    await auditLogsService.log({
      actorUserId,
      action: 'ROLE_UPDATED',
      resource: 'role',
      resourceId: id,
      status: 'SUCCESS',
      metadata: { updates: dto },
    });

    return this.getRoleById(id);
  }

  async deleteRole(id: string, actorUserId?: string): Promise<void> {
    const role = await rolesRepository.findById(id);
    if (!role) {
      throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ErrorCode.ROLE_NOT_FOUND);
    }

    if (role.isSystem) {
      throw new AppError(
        'System roles cannot be deleted',
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.SYSTEM_ROLE_PROTECTED,
      );
    }

    if (role._count.userRoles > 0) {
      throw new AppError(
        'Cannot delete role that is currently assigned to users. Revoke all user assignments first.',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.BAD_REQUEST,
      );
    }

    await rolesRepository.delete(id);
    await authCacheService.invalidateAll();

    await auditLogsService.log({
      actorUserId,
      action: 'ROLE_DELETED',
      resource: 'role',
      resourceId: id,
      status: 'SUCCESS',
      metadata: { name: role.name },
    });
  }

  async assignRoleToUser(
    userId: string,
    roleId: string,
    actorUserId?: string,
  ): Promise<UserRoleAssignmentResponseDto> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ErrorCode.USER_NOT_FOUND);
    }

    const role = await rolesRepository.findById(roleId);
    if (!role) {
      throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ErrorCode.ROLE_NOT_FOUND);
    }

    if (!role.isActive) {
      throw new AppError('Cannot assign inactive role', HTTP_STATUS.BAD_REQUEST, ErrorCode.BAD_REQUEST);
    }

    const existingAssignment = await rolesRepository.findUserRole(userId, roleId);
    if (existingAssignment) {
      throw new AppError(
        'Role is already assigned to this user',
        HTTP_STATUS.CONFLICT,
        ErrorCode.DUPLICATE_ROLE_ASSIGNMENT,
      );
    }

    const assignment = await rolesRepository.assignRoleToUser(userId, roleId);

    // Invalidate user cache on role assignment
    await authCacheService.invalidateUser(user.auth0UserId);

    await auditLogsService.log({
      actorUserId,
      action: 'ROLE_ASSIGNED',
      resource: 'user_role',
      resourceId: `${userId}:${roleId}`,
      status: 'SUCCESS',
      metadata: { userId, roleId, roleName: role.name },
    });

    return {
      userId,
      roleId,
      roleName: role.name,
      assignedAt: assignment.assignedAt.toISOString(),
    };
  }

  async revokeRoleFromUser(userId: string, roleId: string, currentUserId?: string): Promise<void> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ErrorCode.USER_NOT_FOUND);
    }

    const role = await rolesRepository.findById(roleId);
    if (!role) {
      throw new AppError('Role not found', HTTP_STATUS.NOT_FOUND, ErrorCode.ROLE_NOT_FOUND);
    }

    const assignment = await rolesRepository.findUserRole(userId, roleId);
    if (!assignment) {
      throw new AppError(
        'Role is not assigned to this user',
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.ROLE_ASSIGNMENT_NOT_FOUND,
      );
    }

    // Prevent a SUPER_ADMIN from accidentally revoking their own SUPER_ADMIN role (lockout prevention)
    if (role.name === SYSTEM_ROLES.SUPER_ADMIN && userId === currentUserId) {
      throw new AppError(
        'You cannot revoke your own SUPER_ADMIN role',
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.FORBIDDEN,
      );
    }

    await rolesRepository.removeRoleFromUser(userId, roleId);

    // Invalidate user cache on role revocation
    await authCacheService.invalidateUser(user.auth0UserId);

    await auditLogsService.log({
      actorUserId: currentUserId,
      action: 'ROLE_REVOKED',
      resource: 'user_role',
      resourceId: `${userId}:${roleId}`,
      status: 'SUCCESS',
      metadata: { userId, roleId, roleName: role.name },
    });
  }
}

export const rolesService = new RolesService();
