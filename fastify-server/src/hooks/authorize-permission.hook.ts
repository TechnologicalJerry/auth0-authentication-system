import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { SYSTEM_ROLES } from '../common/constants/roles.constants.js';
import type { PermissionName } from '../common/constants/permissions.constants.js';

export interface AuthorizePermissionsOptions {
  permissions: (PermissionName | string)[];
  mode?: 'AND' | 'OR';
}

/**
 * Fastify preHandler hook to restrict route access by fine-grained resource-action permission.
 * Single or multiple permissions with AND / OR evaluation mode.
 * Fails closed (deny by default).
 */
export function authorizePermissions(options: AuthorizePermissionsOptions) {
  const { permissions, mode = 'AND' } = options;

  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.currentUser) {
      throw new AppError(
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_REQUIRED,
      );
    }

    const userRoles = request.currentUser.roles;

    // SUPER_ADMIN has full administrative authority
    if (userRoles.includes(SYSTEM_ROLES.SUPER_ADMIN)) {
      return;
    }

    const userPermissions = request.currentUser.permissions;

    // Wildcard permission check
    if (userPermissions.includes('*')) {
      return;
    }

    const hasPermission =
      mode === 'AND'
        ? permissions.every((perm) => userPermissions.includes(perm))
        : permissions.some((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      throw new AppError(
        'You do not have permission to perform this action',
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.INSUFFICIENT_PERMISSIONS,
      );
    }
  };
}

/**
 * Convenience helper to authorize a single required permission.
 */
export function authorizePermission(permission: PermissionName | string) {
  return authorizePermissions({ permissions: [permission], mode: 'AND' });
}
