import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { appConfig } from '../config/app.config.js';
import { logger } from '../services/logger.service.js';

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: appConfig.database.url });

  const client = new PrismaClient({
    adapter,
    log:
      appConfig.isDevelopment
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [{ emit: 'event', level: 'error' }],
  });

  return client;
}

/** Singleton Prisma client instance */
export const prisma = createPrismaClient();

logger.info('Prisma client initialized');
