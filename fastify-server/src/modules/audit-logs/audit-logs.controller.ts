import type { FastifyRequest, FastifyReply } from 'fastify';
import { auditLogsService } from './audit-logs.service.js';
import { auditLogQuerySchema, auditLogIdParamSchema } from './audit-logs.schema.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';

export class AuditLogsController {
  async getAuditLogs(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parseResult = auditLogQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw new AppError(
        'Invalid query parameters',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        parseResult.error.issues,
      );
    }

    const result = await auditLogsService.getAuditLogs(parseResult.data);
    sendSuccess(reply, HTTP_STATUS.OK, 'Audit logs retrieved successfully', result.items, result.pagination);
  }

  async getAuditLogById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = auditLogIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw new AppError('Invalid audit log ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const record = await auditLogsService.getAuditLogById(paramResult.data.id);
    sendSuccess(reply, HTTP_STATUS.OK, 'Audit log retrieved successfully', record);
  }
}

export const auditLogsController = new AuditLogsController();
