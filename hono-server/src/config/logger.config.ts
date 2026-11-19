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
  base: {
    pid: process.pid,
    app: envConfig.APP_NAME,
    version: envConfig.APP_VERSION,
    env: envConfig.NODE_ENV,
  },
  ...(envConfig.LOG_PRETTY &&
    envConfig.NODE_ENV !== 'production' && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    }),
};
