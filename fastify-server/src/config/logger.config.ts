import type { LoggerOptions } from 'pino';
import { envConfig } from './env.config.js';

export const loggerConfig: LoggerOptions = {
  level: envConfig.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
    ],
    remove: true,
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  transport:
    envConfig.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
};

