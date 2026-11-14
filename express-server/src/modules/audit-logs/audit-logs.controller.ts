import type { Request, Response } from 'express';
import { auditLogsService } from './audit-logs.service.js';
import { auditLogQuerySchema, auditLogIdParamSchema } from './audit-logs.schema.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';

export class AuditLogsController {
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    const parseResult = auditLogQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new AppError('Invalid query parameters', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: parseResult.error.format(),
      });
    }

    const logs = await auditLogsService.getAuditLogs(parseResult.data);
    sendSuccess(res, HTTP_STATUS.OK, 'Audit logs retrieved successfully', logs);
  }

  async getAuditLogById(req: Request, res: Response): Promise<void> {
    const paramResult = auditLogIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid audit log ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const log = await auditLogsService.getAuditLogById(paramResult.data.id);
    sendSuccess(res, HTTP_STATUS.OK, 'Audit log entry retrieved successfully', log);
  }
}

export const auditLogsController = new AuditLogsController();

