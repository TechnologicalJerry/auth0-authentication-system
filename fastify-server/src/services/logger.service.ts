import { pino } from 'pino';
import { loggerConfig } from '../config/logger.config.js';

export const logger = pino(loggerConfig);

export type Logger = typeof logger;

