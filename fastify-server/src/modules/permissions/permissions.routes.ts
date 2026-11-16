import type { FastifyPluginAsync } from 'fastify';
import { permissionsController } from './permissions.controller.js';
import { authenticate } from '../../plugins/auth.plugin.js';
import { authorizePermission } from '../../hooks/authorize-permission.hook.js';
import { PERMISSIONS } from '../../common/constants/permissions.constants.js';

export const permissionsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/',
    { preHandler: [authenticate, authorizePermission(PERMISSIONS.PERMISSIONS_READ)] },
    (request, reply) => permissionsController.getPermissions(request, reply),
  );
};
