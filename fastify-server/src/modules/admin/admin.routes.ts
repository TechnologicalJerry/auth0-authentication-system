import type { FastifyPluginAsync } from 'fastify';
import { adminController } from './admin.controller.js';
import { authenticate } from '../../plugins/auth.plugin.js';
import { authorizeRole } from '../../hooks/authorize-role.hook.js';
import { SYSTEM_ROLES } from '../../common/constants/roles.constants.js';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/dashboard',
    { preHandler: [authenticate, authorizeRole(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN)] },
    (request, reply) => adminController.getDashboard(request, reply),
  );

  fastify.get(
    '/users/statistics',
    { preHandler: [authenticate, authorizeRole(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN)] },
    (request, reply) => adminController.getUserStatistics(request, reply),
  );

  fastify.get(
    '/roles/statistics',
    { preHandler: [authenticate, authorizeRole(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN)] },
    (request, reply) => adminController.getRoleStatistics(request, reply),
  );
};
