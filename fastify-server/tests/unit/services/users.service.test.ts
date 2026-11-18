import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usersService } from '../../../src/modules/users/users.service.js';
import { usersRepository } from '../../../src/modules/users/users.repository.js';
import { authCacheService } from '../../../src/infrastructure/cache/auth-cache.service.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';
import { MOCK_AUTH0_USER } from '../../helpers/mock-auth0.js';

describe('UsersService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncAuth0User', () => {
    it('should reject deactivated user with USER_INACTIVE error', async () => {
      vi.spyOn(usersRepository, 'findByAuth0UserId').mockResolvedValueOnce({
        id: 'u-1',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        emailVerified: true,
        firstName: null,
        lastName: null,
        displayName: null,
        profilePicture: null,
        isActive: false,
        isBlocked: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(usersRepository, 'update').mockResolvedValueOnce({} as any);

      vi.spyOn(authCacheService, 'getUserContext').mockResolvedValueOnce({
        id: 'u-1',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        emailVerified: true,
        firstName: null,
        lastName: null,
        displayName: null,
        profilePicture: null,
        isActive: false,
        isBlocked: false,
        roles: ['USER'],
        permissions: [],
      });

      await expect(usersService.syncAuth0User(MOCK_AUTH0_USER)).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.USER_INACTIVE }),
      );
    });

    it('should reject suspended user with USER_BLOCKED error', async () => {
      vi.spyOn(usersRepository, 'findByAuth0UserId').mockResolvedValueOnce({
        id: 'u-2',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        emailVerified: true,
        firstName: null,
        lastName: null,
        displayName: null,
        profilePicture: null,
        isActive: true,
        isBlocked: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(usersRepository, 'update').mockResolvedValueOnce({} as any);

      vi.spyOn(authCacheService, 'getUserContext').mockResolvedValueOnce({
        id: 'u-2',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        emailVerified: true,
        firstName: null,
        lastName: null,
        displayName: null,
        profilePicture: null,
        isActive: true,
        isBlocked: true,
        roles: ['USER'],
        permissions: [],
      });

      await expect(usersService.syncAuth0User(MOCK_AUTH0_USER)).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.USER_BLOCKED }),
      );
    });

    it('should return cached or resolved CurrentUserContext for active user', async () => {
      vi.spyOn(usersRepository, 'findByAuth0UserId').mockResolvedValueOnce({
        id: 'u-3',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        displayName: 'tester',
        profilePicture: null,
        isActive: true,
        isBlocked: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(usersRepository, 'update').mockResolvedValueOnce({} as any);

      const expectedContext = {
        id: 'u-3',
        auth0UserId: MOCK_AUTH0_USER.sub,
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        displayName: 'tester',
        profilePicture: null,
        isActive: true,
        isBlocked: false,
        roles: ['USER'],
        permissions: ['users:read'],
      };

      vi.spyOn(authCacheService, 'getUserContext').mockResolvedValueOnce(expectedContext);

      const context = await usersService.syncAuth0User(MOCK_AUTH0_USER);
      expect(context).toEqual(expectedContext);
    });
  });

  describe('updateUserStatus', () => {
    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      vi.spyOn(usersRepository, 'findById').mockResolvedValueOnce(null);

      await expect(
        usersService.updateUserStatus('non-existent', { isActive: false }, 'actor-1'),
      ).rejects.toThrowError(expect.objectContaining({ code: ErrorCode.USER_NOT_FOUND }));
    });
  });
});
