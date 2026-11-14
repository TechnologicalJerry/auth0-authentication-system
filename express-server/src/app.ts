import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { appConfig } from './config/app.config.js';
import { logger } from './services/logger.service.js';
import { requestIdMiddleware } from './middlewares/request-id.middleware.js';
import { notFoundMiddleware } from './middlewares/not-found.middleware.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import {
  globalRateLimiter,
  authRateLimiter,
  adminRateLimiter,
} from './middlewares/rate-limit.middleware.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';
import { permissionsRouter } from './modules/permissions/permissions.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { auditLogsRouter } from './modules/audit-logs/audit-logs.routes.js';
import { swaggerRouter } from './docs/swagger.routes.js';

export function createApp(): express.Express {
  const app = express();

  // ---------------------------------------------------------------------------
  // Reverse Proxy Security Configuration
  // ---------------------------------------------------------------------------
  app.set('trust proxy', appConfig.security.trustProxy);

  // ---------------------------------------------------------------------------
  // Security Hardening Middlewares
  // ---------------------------------------------------------------------------

  // HTTP security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Cross-Origin Resource Sharing (CORS) with strict allowlist
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser requests without origin header (curl, mobile apps, internal services)
        if (!origin) return callback(null, true);
        if (appConfig.security.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS not allowed for this origin'));
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
    }),
  );

  // ---------------------------------------------------------------------------
  // Observability & Request Correlation
  // ---------------------------------------------------------------------------

  // Request correlation ID
  app.use(requestIdMiddleware);

  // Structured request/response logging
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id ?? '',
      customLogLevel(_req, res, err) {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      redact: appConfig.logger.redactPaths,
      serializers: {
        req(req) {
          return {
            id: req.id,
            method: req.method,
            url: req.url,
            ip: req.ip,
          };
        },
        res(res) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
    }),
  );

  // Body parsing with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ---------------------------------------------------------------------------
  // API Routes & Documentation
  // ---------------------------------------------------------------------------

  const apiPrefix = appConfig.env.API_PREFIX;

  // Swagger UI & OpenAPI Specification
  if (appConfig.swagger.enabled) {
    app.use(`${apiPrefix}`, swaggerRouter);
  }

  // Health check module (unthrottled for automated orchestrator probes)
  app.use(`${apiPrefix}/health`, healthRouter);

  // Global distributed rate limiting applied to all application routes
  app.use(`${apiPrefix}`, globalRateLimiter);

  // Application endpoints with specialized rate limiting
  app.use(`${apiPrefix}/auth`, authRateLimiter, authRouter);
  app.use(`${apiPrefix}/users`, usersRouter);
  app.use(`${apiPrefix}/roles`, rolesRouter);
  app.use(`${apiPrefix}/permissions`, permissionsRouter);
  app.use(`${apiPrefix}/admin`, adminRateLimiter, adminRouter);
  app.use(`${apiPrefix}/audit-logs`, adminRateLimiter, auditLogsRouter);

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  // Handle undefined routes
  app.use(notFoundMiddleware);

  // Global error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
