import type { Context } from 'hono';
import { authService } from './auth.service.js';
import { formatSuccessResponse } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';
import type { AuthenticatedUser } from '../../integrations/auth0/auth0.types.js';

export class AuthController {
  /**
   * GET /api/v1/auth/me
   * Returns verified authenticated user identity.
   * Requires a valid Auth0 access token.
   */
  getMe(c: Context) {
    const auth = c.get('auth') as AuthenticatedUser | undefined;

    if (!auth) {
      throw new AppError(
        'User is not authenticated',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_REQUIRED,
      );
    }

    const currentUser = c.get('currentUser');
    const userData = authService.getMe(auth, currentUser);

    return c.json(
      formatSuccessResponse(userData, 'Authenticated user retrieved successfully', HTTP_STATUS.OK),
      HTTP_STATUS.OK,
    );
  }

  /**
   * GET /api/v1/auth/status
   * Returns Auth0 integration configuration status.
   * Public endpoint - does not disclose secrets.
   */
  getStatus(c: Context) {
    const status = authService.getStatus();
    return c.json(
      formatSuccessResponse(status, 'Auth0 integration status', HTTP_STATUS.OK),
      HTTP_STATUS.OK,
    );
  }
}

export const authController = new AuthController();
