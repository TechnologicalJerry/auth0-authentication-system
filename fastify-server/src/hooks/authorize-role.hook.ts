import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { SYSTEM_ROLES, type SystemRole } from '../common/constants/roles.constants.js';

/**
 * Fastify preHandler hook to restrict route access to users holding at least one of the specified roles.
 * Fails closed (deny by default).
 *
 * SUPER_ADMIN has global administrative access across all role-guarded endpoints.
 */
export function authorizeRole(...allowedRoles: (SystemRole | string)[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (!request.currentUser) {
      throw new AppError(
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_REQUIRED,
      );
    }

    const userRoles = request.currentUser.roles;

    // SUPER_ADMIN has root authority across all roles
    if (userRoles.includes(SYSTEM_ROLES.SUPER_ADMIN)) {
      return;
    }

    const hasAllowedRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasAllowedRole) {
      throw new AppError(
        'You do not have the required role to access this resource',
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.INSUFFICIENT_ROLE,
      );
    }
  };
}
