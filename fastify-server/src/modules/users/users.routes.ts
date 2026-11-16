import type { FastifyPluginAsync } from 'fastify';
import { usersController } from './users.controller.js';
import { rolesController } from '../roles/roles.controller.js';
import { authenticate } from '../../plugins/auth.plugin.js';
import { authorizePermission } from '../../hooks/authorize-permission.hook.js';
import { PERMISSIONS } from '../../common/constants/permissions.constants.js';

export const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // Current authenticated user profile endpoints
  fastify.get('/me', { preHandler: [authenticate] }, (request, reply) =>
    usersController.getMe(request, reply),
  );
  fastify.patch('/me', { preHandler: [authenticate] }, (request, reply) =>
    usersController.updateMe(request, reply),
  );

  // User-Role assignment endpoints
  fastify.post(
    '/:id/roles',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.ROLES_ASSIGN)] },
    (request, reply) => rolesController.assignRoleToUser(request, reply),
  );
  fastify.delete(
    '/:id/roles/:roleId',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.ROLES_ASSIGN)] },
    (request, reply) => rolesController.revokeRoleFromUser(request, reply),
  );

  // Administrative user management endpoints
  fastify.get(
    '/',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.USERS_READ)] },
    (request, reply) => usersController.getUsers(request, reply),
  );
  fastify.get(
    '/:id',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.USERS_READ)] },
    (request, reply) => usersController.getUserById(request, reply),
  );
  fastify.patch(
    '/:id',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.USERS_UPDATE)] },
    (request, reply) => usersController.updateUser(request, reply),
  );
  fastify.patch(
    '/:id/status',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.USERS_UPDATE)] },
    (request, reply) => usersController.updateUserStatus(request, reply),
  );
};
