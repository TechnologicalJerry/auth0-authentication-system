import type { FastifyReply } from 'fastify';
import type { ApiResponse, PaginatedMeta, PaginatedApiResponse } from '../interfaces/api-response.interface.js';
import { HTTP_STATUS, type HttpStatus } from '../constants/http-status.constants.js';

export function buildSuccessResponse<T>(
  message: string,
  data?: T,
  correlationId?: string,
): ApiResponse<T> {
  return {
    success: true,
    message,
    ...(data !== undefined && { data }),
    timestamp: new Date().toISOString(),
    ...(correlationId && { correlationId }),
  };
}

export function buildPaginatedResponse<T>(
  message: string,
  data: T[],
  meta: PaginatedMeta,
  correlationId?: string,
): PaginatedApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
    ...(correlationId && { correlationId }),
  };
}

export function buildErrorResponse(
  message: string,
  errorCode: string,
  details?: unknown,
  correlationId?: string,
): ApiResponse<never> {
  return {
    success: false,
    message,
    error: {
      code: errorCode,
      message,
      ...(details !== undefined && { details }),
    },
    timestamp: new Date().toISOString(),
    ...(correlationId && { correlationId }),
  };
}

export function sendSuccess<T>(
  reply: FastifyReply,
  statusCode: HttpStatus = HTTP_STATUS.OK,
  message: string,
  data?: T,
  meta?: PaginatedMeta,
): FastifyReply {
  const correlationId = reply.request.id;

  if (meta && Array.isArray(data)) {
    return reply.status(statusCode).send(buildPaginatedResponse(message, data, meta, correlationId));
  }

  return reply.status(statusCode).send(buildSuccessResponse(message, data, correlationId));
}

export function sendError(
  reply: FastifyReply,
  statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  message: string,
  errorCode: string,
  details?: unknown,
): FastifyReply {
  const correlationId = reply.request.id;
  return reply.status(statusCode).send(buildErrorResponse(message, errorCode, details, correlationId));
}

