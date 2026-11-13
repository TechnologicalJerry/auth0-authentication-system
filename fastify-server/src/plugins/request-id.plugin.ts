import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { randomUUID } from 'node:crypto';

const requestIdPluginAsync: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, reply) => {
    const existingId = request.headers['x-request-id'];
    const reqId = typeof existingId === 'string' && existingId.trim() !== ''
      ? existingId
      : randomUUID();

    // Ensure request.id is set and reply headers include it
    request.id = reqId;
    reply.header('x-request-id', reqId);
  });
};

export const requestIdPlugin = fp(requestIdPluginAsync, {
  name: 'request-id-plugin',
  fastify: '5.x',
});

