import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import {
  extractBearerToken,
  authenticate,
} from '../../../src/middlewares/authenticate.middleware.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';
import * as verifier from '../../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../../src/modules/users/users.service.js';
import { MOCK_AUTH0_USER } from '../../helpers/mock-auth0.js';

describe('Authentication Middleware', () => {
  it('should extract token correctly from Bearer authorization header', () => {
    const req = {
      headers: { authorization: 'Bearer my.jwt.token' },
    } as unknown as Request;

    const token = extractBearerToken(req);
    expect(token).toBe('my.jwt.token');
  });

  it('should throw AUTHENTICATION_REQUIRED when authorization header is missing', () => {
    const req = { headers: {} } as unknown as Request;

    expect(() => extractBearerToken(req)).toThrowError(
      expect.objectContaining({ code: ErrorCode.AUTHENTICATION_REQUIRED }),
    );
  });

  it('should throw INVALID_AUTHORIZATION_HEADER for non-Bearer scheme', () => {
    const req = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    } as unknown as Request;

    expect(() => extractBearerToken(req)).toThrowError(
      expect.objectContaining({ code: ErrorCode.INVALID_AUTHORIZATION_HEADER }),
    );
  });

  it('should throw INVALID_AUTHORIZATION_HEADER for empty Bearer token', () => {
    const req = {
      headers: { authorization: 'Bearer   ' },
    } as unknown as Request;

    expect(() => extractBearerToken(req)).toThrowError(
      expect.objectContaining({ code: ErrorCode.INVALID_AUTHORIZATION_HEADER }),
    );
  });

  it('should authenticate request, sync user, and attach currentUser to request', async () => {
    const req = {
      headers: { authorization: 'Bearer valid.token' },
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    vi.spyOn(verifier, 'verifyAccessToken').mockResolvedValueOnce({
      payload: { sub: MOCK_AUTH0_USER.sub },
      user: MOCK_AUTH0_USER,
    });

    vi.spyOn(usersService, 'syncAuth0User').mockResolvedValueOnce({
      id: 'uuid-123',
      auth0UserId: MOCK_AUTH0_USER.sub,
      email: 'test@example.com',
      emailVerified: true,
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Tester',
      profilePicture: null,
      isActive: true,
      isBlocked: false,
      roles: ['USER'],
      permissions: ['users:read'],
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.auth).toEqual(MOCK_AUTH0_USER);
    expect(req.currentUser?.id).toBe('uuid-123');
    expect(req.currentUser?.roles).toContain('USER');
  });
});
