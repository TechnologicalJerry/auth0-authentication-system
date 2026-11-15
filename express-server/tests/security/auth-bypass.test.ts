import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { getTestApp } from '../helpers/test-app.js';
import { auth0Verifier } from '../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../src/modules/users/users.service.js';
import { AppError } from '../../src/common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../src/common/constants/http-status.constants.js';
import { ErrorCode } from '../../src/common/enums/error-code.enum.js';

vi.mock('../../src/integrations/auth0/auth0.verifier.js', () => ({
  auth0Verifier: {
    verifyAccessToken: vi.fn(),
  },
}));

vi.mock('../../src/modules/users/users.service.js', () => ({
  usersService: {
    syncUserFromToken: vi.fn(),
    getUserContext: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/redis/redis.service.js', () => ({
  redisService: {
    consumeToken: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 99,
      resetMs: 60000,
      totalLimit: 100,
    }),
  },
}));

describe('Security: Authentication Bypass Defense', () => {
  const app = getTestApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects requests with missing Authorization header', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('rejects requests with Basic authentication scheme', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Basic dXNlcjpwYXNzd29yZA==');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN_FORMAT');
  });

  it('rejects requests with empty Bearer token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer ');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN_FORMAT');
  });

  it('rejects expired tokens with TOKEN_EXPIRED error code', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockRejectedValue(
      new AppError('Token has expired', HTTP_STATUS.UNAUTHORIZED, ErrorCode.TOKEN_EXPIRED),
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer expired.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects tokens with forged/invalid signature with INVALID_TOKEN_SIGNATURE', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockRejectedValue(
      new AppError('JWT signature verification failed', HTTP_STATUS.UNAUTHORIZED, ErrorCode.INVALID_TOKEN_SIGNATURE),
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer tampered.signature.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN_SIGNATURE');
  });

  it('rejects tokens with wrong issuer with TOKEN_ISSUER_INVALID', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockRejectedValue(
      new AppError('Token issuer does not match configured Auth0 domain', HTTP_STATUS.UNAUTHORIZED, ErrorCode.TOKEN_ISSUER_INVALID),
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer wrong.issuer.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TOKEN_ISSUER_INVALID');
  });

  it('rejects tokens with wrong audience with TOKEN_AUDIENCE_INVALID', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockRejectedValue(
      new AppError('Token audience does not match configured API identifier', HTTP_STATUS.UNAUTHORIZED, ErrorCode.TOKEN_AUDIENCE_INVALID),
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer wrong.audience.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TOKEN_AUDIENCE_INVALID');
  });

  it('rejects suspended users even with a cryptographically valid token', async () => {
    vi.mocked(auth0Verifier.verifyAccessToken).mockResolvedValue({
      sub: 'auth0|suspended-user',
      issuer: 'https://test.auth0.com/',
      audience: 'https://api.test.com',
      scopes: [],
      permissions: [],
      roles: [],
      claims: { email: 'suspended@example.com' },
    });

    vi.mocked(usersService.syncUserFromToken).mockRejectedValue(
      new AppError('User account is suspended', HTTP_STATUS.FORBIDDEN, ErrorCode.ACCOUNT_SUSPENDED),
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid.jwt.token');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});

