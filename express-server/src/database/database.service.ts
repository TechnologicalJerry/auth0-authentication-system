import { prisma } from './prisma.client.js';
import { logger } from '../services/logger.service.js';

export class DatabaseService {
  /**
   * Connect to the database.
   * Should be called during application startup.
   */
  async connect(): Promise<void> {
    try {
      await prisma.$connect();
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.fatal({ err: error }, 'Failed to connect to database');
      throw error;
    }
  }

  /**
   * Disconnect from the database.
   * Should be called during graceful shutdown.
   */
  async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed');
    } catch (error) {
      logger.error({ err: error }, 'Error disconnecting from database');
      throw error;
    }
  }

  /**
   * Check if the database connection is healthy.
   * Returns true if a simple query succeeds.
   */
  async isHealthy(): Promise<boolean> {
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}

export const databaseService = new DatabaseService();
