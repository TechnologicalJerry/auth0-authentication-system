import type { FastifyPluginAsync } from 'fastify';
import { auditLogsController } from './audit-logs.controller.js';
import { authenticate } from '../../plugins/auth.plugin.js';
import { authorizePermission } from '../../hooks/authorize-permission.hook.js';
import { adminRateLimiter } from '../../plugins/rate-limit.plugin.js';
import { PERMISSIONS } from '../../common/constants/permissions.constants.js';

export const auditLogsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/',
    {
      preHandler: [
        adminRateLimiter,
        authenticate,
        authorizePermission(PERMISSIONS.AUDIT_LOGS_READ),
      ],
    },
    (request, reply) => auditLogsController.getAuditLogs(request, reply),
  );

  fastify.get(
    '/:id',
    {
      preHandler: [
        adminRateLimiter,
        authenticate,
        authorizePermission(PERMISSIONS.AUDIT_LOGS_READ),
      ],
    },
    (request, reply) => auditLogsController.getAuditLogById(request, reply),
  );
};
