import 'dotenv/config';
import { createApp } from './app.js';
import { appConfig } from './config/app.config.js';
import { logger } from './services/logger.service.js';
import { databaseService } from './database/database.service.js';
import { redisService } from './infrastructure/redis/redis.service.js';

let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  const app = createApp();
  const { PORT, APP_NAME } = appConfig.env;

  // ---------------------------------------------------------------------------
  // Infrastructure Initialization
  // ---------------------------------------------------------------------------

  // Connect to PostgreSQL database
  await databaseService.connect();

  // Initialize Redis infrastructure connection
  await redisService.connect();

  // ---------------------------------------------------------------------------
  // Server Listen
  // ---------------------------------------------------------------------------

  const server = app.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        environment: appConfig.env.NODE_ENV,
        apiPrefix: appConfig.env.API_PREFIX,
        docs: appConfig.swagger.enabled ? `${appConfig.env.API_PREFIX}/docs` : 'disabled',
      },
      `${APP_NAME} is running on port ${PORT}`,
    );
  });

  // ---------------------------------------------------------------------------
  // Graceful Shutdown & Lifecycle Management
  // ---------------------------------------------------------------------------

  const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
      logger.warn({ signal }, 'Shutdown already in progress; ignoring duplicate signal');
      return;
    }
    isShuttingDown = true;

    logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

    // Force hard exit if graceful shutdown exceeds configured timeout
    const forceExitTimer = setTimeout(() => {
      logger.fatal(
        { timeoutMs: appConfig.shutdown.timeoutMs },
        'Forced shutdown: graceful termination timed out',
      );
      process.exit(1);
    }, appConfig.shutdown.timeoutMs).unref();

    try {
      // 1. Stop accepting new HTTP requests and drain active connections
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          logger.info('HTTP server closed, all connections drained');
          resolve();
        });
      });

      // 2. Disconnect Redis connection pool
      await redisService.disconnect();

      // 3. Disconnect PostgreSQL connection pool
      await databaseService.disconnect();

      clearTimeout(forceExitTimer);
      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      clearTimeout(forceExitTimer);
      logger.fatal({ err: error }, 'Error during graceful shutdown execution');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  // ---------------------------------------------------------------------------
  // Process-Level Exception & Rejection Handlers
  // ---------------------------------------------------------------------------

  process.on('unhandledRejection', (reason: unknown) => {
    logger.fatal({ err: reason }, 'Unhandled Promise rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught Exception');
    process.exit(1);
  });
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal startup failure:', error);
  process.exit(1);
});
