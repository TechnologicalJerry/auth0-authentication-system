import type { FastifyPluginAsync, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { AppError } from '../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { sendError } from '../common/utils/response.util.js';
import { logger } from '../services/logger.service.js';

const errorHandlerPluginAsync: FastifyPluginAsync = async (fastify) => {
  // Not found handler (404)
  fastify.setNotFoundHandler((request, reply) => {
    sendError(
      reply,
      HTTP_STATUS.NOT_FOUND,
      `Route ${request.method} ${request.url} not found`,
      ErrorCode.ROUTE_NOT_FOUND,
    );
  });

  // Global error handler
  fastify.setErrorHandler((error: FastifyError | AppError | Error, request, reply) => {
    // 1. Known AppError
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        logger.error({ err: error, reqId: request.id }, 'Operational AppError (5xx)');
      } else {
        logger.warn({ err: error, reqId: request.id }, `AppError (${error.statusCode}): ${error.message}`);
      }
      return sendError(reply, error.statusCode, error.message, error.errorCode, error.details);
    }

    // 2. Zod validation error
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      logger.warn({ details, reqId: request.id }, 'Zod validation error');
      return sendError(
        reply,
        HTTP_STATUS.BAD_REQUEST,
        'Request validation failed',
        ErrorCode.VALIDATION_ERROR,
        details,
      );
    }

    // 3. Fastify internal validation error
    if ('validation' in error && error.validation) {
      logger.warn({ validation: error.validation, reqId: request.id }, 'Fastify schema validation error');
      return sendError(
        reply,
        HTTP_STATUS.BAD_REQUEST,
        error.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR,
        error.validation,
      );
    }

    // 4. Fastify HTTP error with status code
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      const statusCode = error.statusCode as any;
      if (statusCode === 404) {
        return sendError(
          reply,
          HTTP_STATUS.NOT_FOUND,
          error.message || 'Resource not found',
          ErrorCode.RESOURCE_NOT_FOUND,
        );
      }
      if (statusCode >= 400 && statusCode < 500) {
        return sendError(
          reply,
          statusCode,
          error.message,
          ErrorCode.BAD_REQUEST,
        );
      }
    }

    // 5. Unhandled unexpected errors (500)
    logger.error(
      {
        err: error,
        reqId: request.id,
        method: request.method,
        url: request.url,
      },
      'Unhandled internal server exception',
    );

    return sendError(
      reply,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'Internal server error',
      ErrorCode.INTERNAL_SERVER_ERROR,
    );
  });
};

export const errorHandlerPlugin = fp(errorHandlerPluginAsync, {
  name: 'error-handler-plugin',
  fastify: '5.x',
});

