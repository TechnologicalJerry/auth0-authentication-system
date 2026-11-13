import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { appConfig } from '../config/app.config.js';
import { logger } from '../services/logger.service.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: appConfig.database.url,
  max: appConfig.database.maxConnections,
  connectionTimeoutMillis: appConfig.database.connectionTimeoutMs,
  idleTimeoutMillis: appConfig.database.idleTimeoutMs,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL client pool error');
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log:
    appConfig.server.isDevelopment
      ? ['query', 'warn', 'error']
      : ['error'],
});

export { pool };

