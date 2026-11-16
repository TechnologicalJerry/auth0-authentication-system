import type { FastifyPluginAsync } from 'fastify';
import { rolesController } from './roles.controller.js';
import { permissionsController } from '../permissions/permissions.controller.js';
import { authenticate } from '../../plugins/auth.plugin.js';
import { authorizePermission } from '../../hooks/authorize-permission.hook.js';
import { PERMISSIONS } from '../../common/constants/permissions.constants.js';

export const rolesRoutes: FastifyPluginAsync = async (fastify) => {
  // Role CRUD
  fastify.get(
    '/',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.ROLES_READ)] },
    (request, reply) => rolesController.getRoles(request, reply),
  );
  fastify.get(
    '/:id',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.ROLES_READ)] },
    (request, reply) => rolesController.getRoleById(request, reply),
  );
  fastify.post(
    '/',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.ROLES_CREATE)] },
    (request, reply) => rolesController.createRole(request, reply),
  );
  fastify.patch(
    '/:id',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.ROLES_UPDATE)] },
    (request, reply) => rolesController.updateRole(request, reply),
  );
  fastify.delete(
    '/:id',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.ROLES_DELETE)] },
    (request, reply) => rolesController.deleteRole(request, reply),
  );

  // Role Permissions
  fastify.get(
    '/:id/permissions',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.PERMISSIONS_READ)] },
    (request, reply) => permissionsController.getRolePermissions(request, reply),
  );
  fastify.put(
    '/:id/permissions',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.PERMISSIONS_MANAGE)] },
    (request, reply) => permissionsController.updateRolePermissions(request, reply),
  );
};
