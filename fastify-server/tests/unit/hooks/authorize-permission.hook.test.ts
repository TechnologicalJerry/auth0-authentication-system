import { describe, it, expect } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  authorizePermission,
  authorizePermissions,
} from '../../../src/hooks/authorize-permission.hook.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';
import { SYSTEM_ROLES } from '../../../src/common/constants/roles.constants.js';

describe('authorizePermission and authorizePermissions Fastify Hooks', () => {
  it('should throw AUTHENTICATION_REQUIRED if request.currentUser is missing', async () => {
    const req = {} as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizePermission('users:read');

    await expect(hook(req, reply)).rejects.toThrowError(
      expect.objectContaining({ code: ErrorCode.AUTHENTICATION_REQUIRED }),
    );
  });

  it('should allow access if user has the single required permission', async () => {
    const req = {
      currentUser: {
        roles: [SYSTEM_ROLES.USER],
        permissions: ['users:read'],
      },
    } as unknown as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizePermission('users:read');

    await expect(hook(req, reply)).resolves.toBeUndefined();
  });

  it('should allow SUPER_ADMIN access without checking explicit permissions', async () => {
    const req = {
      currentUser: {
        roles: [SYSTEM_ROLES.SUPER_ADMIN],
        permissions: [],
      },
    } as unknown as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizePermission('users:delete');

    await expect(hook(req, reply)).resolves.toBeUndefined();
  });

  it('should allow access if user has wildcard permission *', async () => {
    const req = {
      currentUser: {
        roles: [SYSTEM_ROLES.USER],
        permissions: ['*'],
      },
    } as unknown as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizePermission('roles:delete');

    await expect(hook(req, reply)).resolves.toBeUndefined();
  });

  it('should reject access with INSUFFICIENT_PERMISSIONS if user lacks permission', async () => {
    const req = {
      currentUser: {
        roles: [SYSTEM_ROLES.USER],
        permissions: ['users:read'],
      },
    } as unknown as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizePermission('users:delete');

    await expect(hook(req, reply)).rejects.toThrowError(
      expect.objectContaining({ code: ErrorCode.INSUFFICIENT_PERMISSIONS }),
    );
  });

  describe('multiple permissions evaluation', () => {
    it('evaluates AND mode requiring all permissions', async () => {
      const req = {
        currentUser: {
          roles: [SYSTEM_ROLES.USER],
          permissions: ['users:read'],
        },
      } as unknown as FastifyRequest;
      const reply = {} as FastifyReply;
      const hook = authorizePermissions({
        permissions: ['users:read', 'users:write'],
        mode: 'AND',
      });

      await expect(hook(req, reply)).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.INSUFFICIENT_PERMISSIONS }),
      );
    });

    it('evaluates OR mode requiring at least one permission', async () => {
      const req = {
        currentUser: {
          roles: [SYSTEM_ROLES.USER],
          permissions: ['users:read'],
        },
      } as unknown as FastifyRequest;
      const reply = {} as FastifyReply;
      const hook = authorizePermissions({
        permissions: ['users:read', 'users:write'],
        mode: 'OR',
      });

      await expect(hook(req, reply)).resolves.toBeUndefined();
    });
  });
});
