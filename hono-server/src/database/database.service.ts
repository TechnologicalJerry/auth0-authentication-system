import { prisma, pool } from './prisma.client.js';
import { logger } from '../services/logger.service.js';

export class DatabaseService {
  private isConnected = false;

  async connect(): Promise<void> {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      this.isConnected = true;
      logger.info('Database connection established successfully');
    } catch (error) {
      this.isConnected = false;
      logger.error({ err: error }, 'Failed to establish database connection');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect();
      await pool.end();
      this.isConnected = false;
      logger.info('Database connection closed cleanly');
    } catch (error) {
      logger.error({ err: error }, 'Error closing database connection');
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.warn({ err: error }, 'Database health check failed');
      return false;
    }
  }

  async ping(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const databaseService = new DatabaseService();
