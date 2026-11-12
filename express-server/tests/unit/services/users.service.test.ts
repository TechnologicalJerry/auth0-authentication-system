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
  });

  describe('updateProfile', () => {
    it('should invalidate cache when user updates profile', async () => {
      const invalidateSpy = vi.spyOn(authCacheService, 'invalidateUser').mockResolvedValueOnce();

      vi.spyOn(usersRepository, 'findById').mockResolvedValueOnce({
        id: 'user-1',
        auth0UserId: 'auth0|123',
        email: 'user@example.com',
        emailVerified: true,
        firstName: 'Old',
        lastName: 'Name',
        displayName: 'OldName',
        profilePicture: null,
        isActive: true,
        isBlocked: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(usersRepository, 'update').mockResolvedValueOnce({
        id: 'user-1',
        auth0UserId: 'auth0|123',
        email: 'user@example.com',
        emailVerified: true,
        firstName: 'New',
        lastName: 'Name',
        displayName: 'NewName',
        profilePicture: null,
        isActive: true,
        isBlocked: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(authCacheService, 'getUserContext').mockResolvedValueOnce({
        id: 'user-1',
        auth0UserId: 'auth0|123',
        email: 'user@example.com',
        emailVerified: true,
        firstName: 'New',
        lastName: 'Name',
        displayName: 'NewName',
        profilePicture: null,
        isActive: true,
        isBlocked: false,
        roles: ['USER'],
        permissions: [],
      });

      await usersService.updateProfile('user-1', { firstName: 'New' });

      expect(invalidateSpy).toHaveBeenCalledWith('auth0|123');
    });
  });
});
