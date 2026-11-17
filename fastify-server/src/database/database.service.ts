import { prisma, pool } from './prisma.client.js';
import { logger } from '../services/logger.service.js';

export class DatabaseService {
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      this.isConnected = true;
      logger.info('Database connection established successfully (PostgreSQL 18 via @prisma/adapter-pg)');
    } catch (err) {
      this.isConnected = false;
      logger.error({ err }, 'Failed to establish database connection');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    try {
      await prisma.$disconnect();
      await pool.end();
      this.isConnected = false;
      logger.info('Database connection closed cleanly');
    } catch (err) {
      logger.error({ err }, 'Error disconnecting from database');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      logger.warn({ err }, 'Database health check ping failed');
      return false;
    }
  }

  async ping(): Promise<{ healthy: boolean; latencyMs: number }> {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - startTime;
      return { healthy: true, latencyMs };
    } catch (err) {
      logger.warn({ err }, 'Database ping check failed');
      return { healthy: false, latencyMs: -1 };
    }
  }
}

export const databaseService = new DatabaseService();

