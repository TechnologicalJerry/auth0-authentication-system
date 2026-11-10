import pino from 'pino';
import { appConfig } from '../config/app.config.js';

function createLogger(): pino.Logger {
  const { logger: loggerConfig, isProduction } = appConfig;

  const baseOptions: pino.LoggerOptions = {
    level: loggerConfig.level,
    redact: {
      paths: loggerConfig.redactPaths,
      censor: '[REDACTED]',
    },
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (isProduction || loggerConfig.format === 'json') {
    return pino(baseOptions);
  }

  // Development: use pino-pretty transport for readable output
  return pino({
    ...baseOptions,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  });
}

export const logger = createLogger();
