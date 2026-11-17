import { buildApp } from './app.js';
import { appConfig } from './config/app.config.js';
import { databaseService } from './database/database.service.js';
import { redisService } from './infrastructure/redis/redis.service.js';
import { logger } from './services/logger.service.js';

async function bootstrap(): Promise<void> {
  const app = buildApp();

  try {
    // 1. Initialize PostgreSQL database connection
    await databaseService.connect();

    // 2. Initialize Redis connection pool
    await redisService.connect();

    // 3. Start HTTP server
    const address = await app.listen({
      port: appConfig.server.port,
      host: appConfig.server.host,
    });

    logger.info(
      `Fastify server listening on ${address} [env: ${appConfig.env.NODE_ENV}, prefix: ${appConfig.server.apiPrefix}]`,
    );
  } catch (err) {
    logger.fatal({ err }, 'Fatal error during server bootstrap');
    await redisService.disconnect();
    await databaseService.disconnect();
    process.exit(1);
  }

  // Graceful shutdown management
  let isShuttingDown = false;

  async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}. Initiating multi-resource graceful shutdown...`);

    const timeoutMs = appConfig.shutdown.timeoutMs;
    const forceExitTimeout = setTimeout(() => {
      logger.error({ timeoutMs }, 'Graceful shutdown timeout exceeded. Forcing termination.');
      process.exit(1);
    }, timeoutMs);
    forceExitTimeout.unref();

    try {
      // 1. Close HTTP server and drain in-flight requests
      await app.close();
      logger.info('HTTP server closed cleanly');

      // 2. Disconnect Redis connection pool
      await redisService.disconnect();
      logger.info('Redis client disconnected cleanly');

      // 3. Disconnect PostgreSQL database pool
      await databaseService.disconnect();
      logger.info('Database pool drained and disconnected');

      clearTimeout(forceExitTimeout);
      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during graceful shutdown');
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception detected');
    void gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection detected');
    void gracefulShutdown('unhandledRejection');
  });
}

void bootstrap();
