import pino, { type Logger } from 'pino';
import { loggerConfig } from '../config/logger.config.js';

export const logger: Logger = pino(loggerConfig);
