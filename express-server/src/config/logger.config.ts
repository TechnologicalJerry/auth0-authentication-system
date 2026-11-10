import type { EnvConfig } from './env.config.js';

export interface LoggerConfig {
  level: string;
  format: 'json' | 'pretty';
  redactPaths: string[];
}

export function createLoggerConfig(env: EnvConfig): LoggerConfig {
  return {
    level: env.LOG_LEVEL,
    format: env.NODE_ENV === 'production' ? 'json' : env.LOG_FORMAT,
    redactPaths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      'req.body.password',
      'req.body.confirmPassword',
      'req.body.currentPassword',
      'req.body.newPassword',
      'req.body.accessToken',
      'req.body.refreshToken',
      'req.body.token',
      'req.body.secret',
      'res.headers["set-cookie"]',
    ],
  };
}
