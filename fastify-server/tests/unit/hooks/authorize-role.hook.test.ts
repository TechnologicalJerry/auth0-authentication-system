import { describe, it, expect } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { authorizeRole } from '../../../src/hooks/authorize-role.hook.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';
import { SYSTEM_ROLES } from '../../../src/common/constants/roles.constants.js';

describe('authorizeRole Fastify Hook', () => {
  it('should throw AUTHENTICATION_REQUIRED if request.currentUser is missing', async () => {
    const req = {} as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizeRole(SYSTEM_ROLES.ADMIN);

    await expect(hook(req, reply)).rejects.toThrowError(
      expect.objectContaining({ code: ErrorCode.AUTHENTICATION_REQUIRED }),
    );
  });

  it('should allow access if user possesses the required role', async () => {
    const req = {
      currentUser: { roles: [SYSTEM_ROLES.ADMIN] },
    } as unknown as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizeRole(SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.MANAGER);

    await expect(hook(req, reply)).resolves.toBeUndefined();
  });

  it('should allow SUPER_ADMIN root access regardless of specified roles', async () => {
    const req = {
      currentUser: { roles: [SYSTEM_ROLES.SUPER_ADMIN] },
    } as unknown as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizeRole(SYSTEM_ROLES.VIEWER);

    await expect(hook(req, reply)).resolves.toBeUndefined();
  });

  it('should reject access with INSUFFICIENT_ROLE if user lacks the required role', async () => {
    const req = {
      currentUser: { roles: [SYSTEM_ROLES.USER] },
    } as unknown as FastifyRequest;
    const reply = {} as FastifyReply;
    const hook = authorizeRole(SYSTEM_ROLES.ADMIN);

    await expect(hook(req, reply)).rejects.toThrowError(
      expect.objectContaining({ code: ErrorCode.INSUFFICIENT_ROLE }),
    );
  });
});
