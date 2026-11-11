import type { Request, Response, NextFunction } from 'express';
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
 * Middleware to restrict route access by fine-grained resource-action permission.
 * Single or multiple permissions with AND / OR evaluation mode.
 * Deny by default (fails closed).
 */
export function authorizePermissions(options: AuthorizePermissionsOptions) {
  const { permissions, mode = 'AND' } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      throw new AppError(
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_REQUIRED,
      );
    }

    const userRoles = req.currentUser.roles;

    // SUPER_ADMIN has full administrative authority
    if (userRoles.includes(SYSTEM_ROLES.SUPER_ADMIN)) {
      next();
      return;
    }

    const userPermissions = req.currentUser.permissions;

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

    next();
  };
}

/**
 * Convenience helper to authorize a single required permission.
 */
export function authorizePermission(permission: PermissionName | string) {
  return authorizePermissions({ permissions: [permission], mode: 'AND' });
}

