import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { appConfig } from './config/app.config.js';
import { logger } from './services/logger.service.js';
import { requestIdPlugin } from './plugins/request-id.plugin.js';
import { errorHandlerPlugin } from './plugins/error-handler.plugin.js';
import { healthRoutes } from './modules/health/health.routes.js';

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = fastify({
    loggerInstance: logger,
    trustProxy: appConfig.security.trustProxy,
    disableRequestLogging: false,
    ...options,
  });

  // Core Request Correlation & Identification
  app.register(requestIdPlugin);

  // Centralized Error & Not Found Handling
  app.register(errorHandlerPlugin);

  // API Routes
  const prefix = appConfig.server.apiPrefix;
  app.register(healthRoutes, { prefix: `${prefix}/health` });

  return app;
}

