import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { appConfig } from './config/app.config.js';
import { logger } from './services/logger.service.js';
import { requestIdPlugin } from './plugins/request-id.plugin.js';
import { errorHandlerPlugin } from './plugins/error-handler.plugin.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { swaggerPlugin } from './docs/swagger.plugin.js';
import {
  globalRateLimiter,
  authRateLimiter,
  adminRateLimiter,
} from './plugins/rate-limit.plugin.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';
import { permissionsRoutes } from './modules/permissions/permissions.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { auditLogsRoutes } from './modules/audit-logs/audit-logs.routes.js';

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify({
    loggerInstance: logger,
    trustProxy: appConfig.security.trustProxy,
    disableRequestLogging: false,
    bodyLimit: 1048576, // 1MB body limit
    ...options,
  });

  // ---------------------------------------------------------------------------
  // Security Hardening Plugins
  // ---------------------------------------------------------------------------

  // HTTP security headers via Helmet
  app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // Cross-Origin Resource Sharing (CORS) with strict allowlist
  app.register(fastifyCors, {
    origin: (origin, callback) => {
      // Allow non-browser requests without origin header (curl, mobile apps, internal services)
      if (!origin) return callback(null, true);
      if (appConfig.security.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed for this origin'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: [
      'X-Request-ID',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After',
    ],
    credentials: true,
    maxAge: 86400,
  });

  // ---------------------------------------------------------------------------
  // Observability & Request Correlation
  // ---------------------------------------------------------------------------
  app.register(requestIdPlugin);

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------
  app.register(errorHandlerPlugin);

  // ---------------------------------------------------------------------------
  // Authentication & Authorization Decorators
  // ---------------------------------------------------------------------------
  app.register(authPlugin);

  // ---------------------------------------------------------------------------
  // OpenAPI Documentation
  // ---------------------------------------------------------------------------
  app.register(swaggerPlugin);

  // ---------------------------------------------------------------------------
  // API Routes with Specialized Rate Limiting
  // ---------------------------------------------------------------------------
  const prefix = appConfig.server.apiPrefix;

  // Health check module (unthrottled for automated orchestrator probes)
  app.register(healthRoutes, { prefix: `${prefix}/health` });

  // Rate-limited application routes
  app.register(
    async (authScope) => {
      authScope.addHook('preHandler', authRateLimiter);
      authScope.register(authRoutes);
    },
    { prefix: `${prefix}/auth` },
  );

  app.register(
    async (userScope) => {
      userScope.addHook('preHandler', globalRateLimiter);
      userScope.register(usersRoutes);
    },
    { prefix: `${prefix}/users` },
  );

  app.register(
    async (roleScope) => {
      roleScope.addHook('preHandler', globalRateLimiter);
      roleScope.register(rolesRoutes);
    },
    { prefix: `${prefix}/roles` },
  );

  app.register(
    async (permScope) => {
      permScope.addHook('preHandler', globalRateLimiter);
      permScope.register(permissionsRoutes);
    },
    { prefix: `${prefix}/permissions` },
  );

  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', adminRateLimiter);
      adminScope.register(adminRoutes);
    },
    { prefix: `${prefix}/admin` },
  );

  app.register(
    async (auditScope) => {
      auditScope.addHook('preHandler', adminRateLimiter);
      auditScope.register(auditLogsRoutes);
    },
    { prefix: `${prefix}/audit-logs` },
  );

  return app;
}
