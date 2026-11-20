import { serve, type ServerType } from '@hono/node-server';
import { createApp } from './app.js';
import { appConfig } from './config/app.config.js';
import { databaseService } from './database/database.service.js';
import { logger } from './services/logger.service.js';

let server: ServerType | null = null;
let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  try {
    // 1. Establish database connection
    await databaseService.connect();

    // 2. Build Hono application instance
    const app = createApp();

    // 3. Start Node.js HTTP server via @hono/node-server
    server = serve(
      {
        fetch: app.fetch,
        port: appConfig.server.port,
        hostname: appConfig.server.host,
      },
      (info) => {
        logger.info(
          {
            port: info.port,
            address: info.address,
            env: appConfig.server.isProduction ? 'production' : 'development',
            nodeVersion: process.version,
            apiPrefix: appConfig.server.apiPrefix,
          },
          `🚀 Hono server is running on http://${info.address}:${info.port}`,
        );
      },
    );
  } catch (error) {
    logger.fatal({ err: error }, 'Fatal error during server bootstrap');
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Received termination signal, starting graceful shutdown...');

  // Set safety timeout to prevent hanging process
  const forceTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 10s, forcing exit');
    process.exit(1);
  }, 10000);
  forceTimeout.unref();

  try {
    // 1. Close HTTP server
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      logger.info('HTTP server closed cleanly');
    }

    // 2. Close database connection pool
    await databaseService.disconnect();
    logger.info('Database disconnected cleanly');

    clearTimeout(forceTimeout);
    logger.info('Graceful shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown');
    clearTimeout(forceTimeout);
    process.exit(1);
  }
}

// Process signal listeners
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception detected');
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled promise rejection detected');
  void gracefulShutdown('unhandledRejection');
});

// Start the server
void bootstrap();
