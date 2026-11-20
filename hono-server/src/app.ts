import { Hono } from 'hono';
import { appConfig } from './config/app.config.js';
import { requestIdMiddleware, type RequestIdVariables } from './middlewares/request-id.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { healthController } from './modules/health/health.controller.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import type { AuthenticatedUser } from './integrations/auth0/auth0.types.js';

export type AppContext = {
  Variables: RequestIdVariables & {
    auth?: AuthenticatedUser;
    currentUser?: any;
  };
};

export function createApp(): Hono<AppContext> {
  const app = new Hono<AppContext>();

  // 1. Request correlation ID middleware
  app.use('*', requestIdMiddleware);

  // 2. Error handling hooks
  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  // 3. Health & monitoring routes (root level for orchestrators / probes)
  app.get('/health', (c) => healthController.getHealth(c));
  app.get('/health/live', (c) => healthController.getLiveness(c));
  app.get('/health/ready', (c) => healthController.getReadiness(c));
  app.get('/live', (c) => healthController.getLiveness(c));
  app.get('/ready', (c) => healthController.getReadiness(c));

  // 4. API prefixed routes (/api/v1/health, /api/v1/auth)
  app.route(`${appConfig.server.apiPrefix}/health`, healthRoutes);
  app.route(`${appConfig.server.apiPrefix}/auth`, authRoutes);

  return app;
}
