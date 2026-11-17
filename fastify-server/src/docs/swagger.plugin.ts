import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { appConfig } from '../config/app.config.js';

const swaggerPluginAsync: FastifyPluginAsync = async (fastify) => {
  if (!appConfig.swagger.enabled) {
    return;
  }

  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Auth0 Authentication System — Fastify Server',
        description: 'Production-ready Fastify backend API with Auth0 authentication, RBAC, Redis caching, and distributed rate limiting.',
        version: appConfig.server.appVersion,
      },
      servers: [
        {
          url: `http://localhost:${appConfig.server.port}${appConfig.server.apiPrefix}`,
          description: 'Local development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Auth0-issued RS256 JWT access token',
          },
        },
      },
      security: [{ bearerAuth: [] }],
      tags: [
        { name: 'Health', description: 'System health, liveness, and readiness probes' },
        { name: 'Auth', description: 'Authentication and verified identity inspection' },
        { name: 'Users', description: 'User profile and administrative user management' },
        { name: 'Roles', description: 'Role definitions and user-role assignment' },
        { name: 'Permissions', description: 'Permission catalog and role mapping' },
        { name: 'Admin', description: 'Administrative analytics and system metrics' },
        { name: 'Audit Logs', description: 'Append-only audit trail exploration' },
      ],
    },
  });

  const apiPrefix = appConfig.server.apiPrefix;

  await fastify.register(fastifySwaggerUi, {
    routePrefix: `${apiPrefix}/docs`,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
    },
    staticCSP: true,
  });

  fastify.get(`${apiPrefix}/openapi.json`, async (_request, reply) => {
    return reply.send(fastify.swagger());
  });
};

export const swaggerPlugin = fp(swaggerPluginAsync, {
  name: 'swagger-plugin',
  fastify: '5.x',
});
