import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/test-app.js';
import { verifyAccessToken } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { AppError } from '../../src/common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../src/common/constants/http-status.constants.js';
import { ErrorCode } from '../../src/common/enums/error-code.enum.js';

vi.mock('../../src/integrations/auth0/auth0.verifier.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../src/modules/users/users.service.js', () => ({
  usersService: {
    syncAuth0User: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    consumeRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      limit: 100,
      resetTimeMs: 60000,
      retryAfterSeconds: 0,
    }),
  },
}));

describe('Security: Authentication Bypass Defense', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests with missing Authorization header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects requests with Basic authentication scheme', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Basic dXNlcjpwYXNzd29yZA==',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INVALID_TOKEN_FORMAT');
  });

  it('rejects requests with empty Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer   ',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INVALID_TOKEN_FORMAT');
  });

  it('rejects expired tokens and reports TOKEN_EXPIRED', async () => {
    vi.mocked(verifyAccessToken).mockRejectedValueOnce(
      new AppError('Token expired', HTTP_STATUS.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED),
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer expired.mock.token',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('TOKEN_EXPIRED');
  });

  it('rejects tokens signed by an untrusted issuer', async () => {
    vi.mocked(verifyAccessToken).mockRejectedValueOnce(
      new AppError('Untrusted issuer', HTTP_STATUS.UNAUTHORIZED, ErrorCode.INVALID_TOKEN_ISSUER),
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: 'Bearer bad.issuer.token',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('INVALID_TOKEN_ISSUER');
  });
});
