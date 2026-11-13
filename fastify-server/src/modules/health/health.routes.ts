import type { FastifyPluginAsync } from 'fastify';
import { healthController } from './health.controller.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', (request, reply) => healthController.getHealth(request, reply));
  fastify.get('/live', (request, reply) => healthController.getLiveness(request, reply));
  fastify.get('/ready', (request, reply) => healthController.getReadiness(request, reply));
};

