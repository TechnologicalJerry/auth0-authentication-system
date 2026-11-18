import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { extractBearerToken, authenticate } from '../../../src/plugins/auth.plugin.js';
import { verifyAccessToken } from '../../../src/integrations/auth0/auth0.verifier.js';
import { usersService } from '../../../src/modules/users/users.service.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';
import { MOCK_AUTH0_USER } from '../../helpers/mock-auth0.js';

vi.mock('../../../src/integrations/auth0/auth0.verifier.js', () => ({
  verifyAccessToken: vi.fn(),
}));

vi.mock('../../../src/modules/users/users.service.js', () => ({
  usersService: {
    syncAuth0User: vi.fn(),
  },
}));

vi.mock('../../../src/services/logger.service.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('auth.plugin — authenticate hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractBearerToken', () => {
    it('returns null when authorization header is missing', () => {
      const req = { headers: {} } as FastifyRequest;
      expect(extractBearerToken(req)).toBeNull();
    });

    it('throws INVALID_TOKEN_FORMAT when header does not start with Bearer', () => {
      const req = {
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      } as unknown as FastifyRequest;

      expect(() => extractBearerToken(req)).toThrowError(
        expect.objectContaining({ code: ErrorCode.INVALID_TOKEN_FORMAT }),
      );
    });

    it('throws INVALID_TOKEN_FORMAT when Bearer token is empty', () => {
      const req = {
        headers: { authorization: 'Bearer   ' },
      } as unknown as FastifyRequest;

      expect(() => extractBearerToken(req)).toThrowError(
        expect.objectContaining({ code: ErrorCode.INVALID_TOKEN_FORMAT }),
      );
    });

    it('extracts valid Bearer token correctly', () => {
      const req = {
        headers: { authorization: 'Bearer my.jwt.token' },
      } as unknown as FastifyRequest;

      expect(extractBearerToken(req)).toBe('my.jwt.token');
    });
  });

  describe('authenticate hook execution', () => {
    it('throws AUTHENTICATION_REQUIRED if token is missing', async () => {
      const req = { headers: {} } as FastifyRequest;
      const reply = {} as FastifyReply;

      await expect(authenticate(req, reply)).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.AUTHENTICATION_REQUIRED }),
      );
    });

    it('authenticates valid token, syncs user, and attaches auth & currentUser to request', async () => {
      const req = {
        headers: { authorization: 'Bearer valid.jwt.token' },
      } as unknown as FastifyRequest;
      const reply = {} as FastifyReply;

      const mockUserContext = {
        id: 'usr-123',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        status: 'ACTIVE',
        roles: ['USER'],
        permissions: ['users:read'],
      };

      vi.mocked(verifyAccessToken).mockResolvedValueOnce({
        payload: { sub: MOCK_AUTH0_USER.sub },
        user: MOCK_AUTH0_USER,
      });

      vi.mocked(usersService.syncAuth0User).mockResolvedValueOnce(mockUserContext as any);

      await authenticate(req, reply);

      expect(req.auth).toEqual(MOCK_AUTH0_USER);
      expect(req.currentUser).toEqual(mockUserContext);
    });
  });
});
