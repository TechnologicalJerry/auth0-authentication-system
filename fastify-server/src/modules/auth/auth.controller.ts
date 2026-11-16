import type { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';

export class AuthController {
  /**
   * GET /api/v1/auth/me
   * Returns verified authenticated user identity.
   * Requires a valid Auth0 access token.
   */
  getMe(request: FastifyRequest, reply: FastifyReply): void {
    if (!request.auth) {
      throw new AppError(
        'User is not authenticated',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_REQUIRED,
      );
    }

    const userData = authService.getMe(request.auth, request.currentUser);
    sendSuccess(reply, HTTP_STATUS.OK, 'Authenticated user retrieved successfully', userData);
  }

  /**
   * GET /api/v1/auth/status
   * Returns Auth0 integration configuration status.
   * Public endpoint - does not disclose secrets.
   */
  getStatus(_request: FastifyRequest, reply: FastifyReply): void {
    const status = authService.getStatus();
    sendSuccess(reply, HTTP_STATUS.OK, 'Auth0 integration status', status);
  }
}

export const authController = new AuthController();

