import type { FastifyPluginAsync } from 'fastify';
import { authController } from './auth.controller.js';
import { authenticate } from '../../plugins/auth.plugin.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /** Requires valid Auth0 access token */
  fastify.get('/me', { preHandler: [authenticate] }, (request, reply) =>
    authController.getMe(request, reply),
  );

  /** Public - returns integration status */
  fastify.get('/status', (request, reply) =>
    authController.getStatus(request, reply),
  );
};

