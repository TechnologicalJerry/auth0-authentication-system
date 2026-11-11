import type { Request, Response } from 'express';
import { authService } from './auth.service.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';

export class AuthController {
  /**
   * GET /api/v1/auth/me
   * Returns the verified authenticated user identity and application authorization context.
   * Requires a valid Auth0 access token.
   */
  getMe(req: Request, res: Response): void {
    if (!req.auth) {
      throw new AppError(
        'User is not authenticated',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_REQUIRED,
      );
    }

    const userData = authService.getMe(req.auth, req.currentUser);
    sendSuccess(res, HTTP_STATUS.OK, 'Authenticated user retrieved successfully', userData);
  }

  /**
   * GET /api/v1/auth/status
   * Returns Auth0 integration configuration status.
   * Does not disclose credentials or internal JWKS details.
   */
  getStatus(_req: Request, res: Response): void {
    const status = authService.getStatus();
    sendSuccess(res, HTTP_STATUS.OK, 'Auth0 integration status', status);
  }
}

export const authController = new AuthController();
