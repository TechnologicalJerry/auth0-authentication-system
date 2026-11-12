import { describe, it, expect, vi } from 'vitest';
import * as jose from 'jose';
import { verifyAccessToken } from '../../../src/integrations/auth0/auth0.verifier.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';

vi.mock('jose', async () => {
  const actual = await vi.importActual<typeof jose>('jose');
  return {
    ...actual,
    jwtVerify: vi.fn(),
    createRemoteJWKSet: vi.fn().mockReturnValue(vi.fn()),
  };
});

describe('Auth0 Token Verifier', () => {
  it('should successfully verify a valid token and return AuthenticatedUser', async () => {
    vi.mocked(jose.jwtVerify).mockResolvedValueOnce({
      payload: {
        sub: 'auth0|user-123',
        iss: 'https://test-tenant.auth0.com/',
        aud: 'https://api.test-domain.com',
        scope: 'openid email',
      },
      protectedHeader: { alg: 'RS256' },
    } as any);

    const result = await verifyAccessToken('valid.mock.token');

    expect(result.user).toBeDefined();
    expect(result.user.sub).toBe('auth0|user-123');
    expect(result.user.scopes).toContain('openid');
  });

  it('should reject token missing the sub claim', async () => {
    vi.mocked(jose.jwtVerify).mockResolvedValueOnce({
      payload: {
        iss: 'https://test-tenant.auth0.com/',
        aud: 'https://api.test-domain.com',
      },
      protectedHeader: { alg: 'RS256' },
    } as any);

    await expect(verifyAccessToken('token.without.sub')).rejects.toThrow(AppError);
  });

  it('should map JWTExpired to TOKEN_EXPIRED error code', async () => {
    vi.mocked(jose.jwtVerify).mockRejectedValueOnce(
      new jose.errors.JWTExpired('token expired', { exp: 1234567890 }),
    );

    try {
      await verifyAccessToken('expired.token');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe(ErrorCode.TOKEN_EXPIRED);
    }
  });

  it('should map invalid issuer to INVALID_TOKEN_ISSUER', async () => {
    vi.mocked(jose.jwtVerify).mockRejectedValueOnce(
      new jose.errors.JWTClaimValidationFailed('untrusted issuer', { iss: 'untrusted' }, 'iss'),
    );

    try {
      await verifyAccessToken('bad.issuer.token');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe(ErrorCode.INVALID_TOKEN_ISSUER);
    }
  });

  it('should map invalid audience to INVALID_TOKEN_AUDIENCE', async () => {
    vi.mocked(jose.jwtVerify).mockRejectedValueOnce(
      new jose.errors.JWTClaimValidationFailed('invalid audience', { aud: 'wrong' }, 'aud'),
    );

    try {
      await verifyAccessToken('wrong.aud.token');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe(ErrorCode.INVALID_TOKEN_AUDIENCE);
    }
  });

  it('should map JWKS timeout to AUTHENTICATION_SERVICE_UNAVAILABLE', async () => {
    vi.mocked(jose.jwtVerify).mockRejectedValueOnce(new jose.errors.JWKSTimeout());

    try {
      await verifyAccessToken('timeout.token');
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe(ErrorCode.AUTHENTICATION_SERVICE_UNAVAILABLE);
    }
  });
});
