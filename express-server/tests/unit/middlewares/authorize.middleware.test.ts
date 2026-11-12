import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authorizeRole } from '../../../src/middlewares/authorize-role.middleware.js';
import {
  authorizePermission,
  authorizePermissions,
} from '../../../src/middlewares/authorize-permission.middleware.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';
import { SYSTEM_ROLES } from '../../../src/common/constants/roles.constants.js';

describe('Authorization Middlewares', () => {
  describe('authorizeRole', () => {
    it('should throw AUTHENTICATION_REQUIRED if req.currentUser is missing', () => {
      const req = {} as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizeRole(SYSTEM_ROLES.ADMIN);
      expect(() => middleware(req, res, next)).toThrowError(
        expect.objectContaining({ code: ErrorCode.AUTHENTICATION_REQUIRED }),
      );
    });

    it('should allow access if user possesses the required role', () => {
      const req = {
        currentUser: { roles: [SYSTEM_ROLES.ADMIN] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizeRole(SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.MANAGER);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN root access regardless of specified roles', () => {
      const req = {
        currentUser: { roles: [SYSTEM_ROLES.SUPER_ADMIN] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizeRole(SYSTEM_ROLES.VIEWER);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject access with INSUFFICIENT_ROLE if user lacks the required role', () => {
      const req = {
        currentUser: { roles: [SYSTEM_ROLES.USER] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizeRole(SYSTEM_ROLES.ADMIN);
      expect(() => middleware(req, res, next)).toThrowError(
        expect.objectContaining({ code: ErrorCode.INSUFFICIENT_ROLE }),
      );
    });
  });

  describe('authorizePermission', () => {
    it('should allow access if user has the required permission', () => {
      const req = {
        currentUser: { roles: [SYSTEM_ROLES.USER], permissions: ['users:read'] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizePermission('users:read');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow SUPER_ADMIN root access across all permission gates', () => {
      const req = {
        currentUser: { roles: [SYSTEM_ROLES.SUPER_ADMIN], permissions: [] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizePermission('roles:delete');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject access with INSUFFICIENT_PERMISSIONS if permission is absent', () => {
      const req = {
        currentUser: { roles: [SYSTEM_ROLES.USER], permissions: ['users:read'] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizePermission('users:delete');
      expect(() => middleware(req, res, next)).toThrowError(
        expect.objectContaining({ code: ErrorCode.INSUFFICIENT_PERMISSIONS }),
      );
    });

    it('should support AND logic across multiple required permissions', () => {
      const req = {
        currentUser: { roles: [SYSTEM_ROLES.ADMIN], permissions: ['users:read'] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizePermissions({
        permissions: ['users:read', 'users:create'],
        mode: 'AND',
      });

      expect(() => middleware(req, res, next)).toThrowError(
        expect.objectContaining({ code: ErrorCode.INSUFFICIENT_PERMISSIONS }),
      );
    });

    it('should support OR logic across multiple alternative permissions', () => {
      const req = {
        currentUser: { roles: [SYSTEM_ROLES.USER], permissions: ['users:read'] },
      } as unknown as Request;
      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorizePermissions({
        permissions: ['users:update', 'users:read'],
        mode: 'OR',
      });
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
