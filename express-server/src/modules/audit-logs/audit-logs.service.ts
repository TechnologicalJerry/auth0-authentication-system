import { auditLogsRepository } from './audit-logs.repository.js';
import { logger } from '../../services/logger.service.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';
import type {
  CreateAuditLogEntry,
  AuditLogQueryFilter,
  PaginatedAuditLogsResult,
  AuditLogResponseDto,
} from './audit-logs.types.js';

export class AuditLogsService {
  /**
   * Appends an append-only audit log record.
   * Catches and logs errors so audit logging never abruptly terminates the primary workflow.
   */
  async log(entry: CreateAuditLogEntry): Promise<void> {
    try {
      await auditLogsRepository.create(entry);
    } catch (err) {
      logger.error({ err, entry }, 'Failed to record audit log entry');
    }
  }

  async getAuditLogs(query: AuditLogQueryFilter): Promise<PaginatedAuditLogsResult> {
    return auditLogsRepository.findMany(query);
  }

  async getAuditLogById(id: string): Promise<AuditLogResponseDto> {
    const record = await auditLogsRepository.findById(id);
    if (!record) {
      throw new AppError('Audit log entry not found', HTTP_STATUS.NOT_FOUND, ErrorCode.RESOURCE_NOT_FOUND);
    }
    return record;
  }
}

export const auditLogsService = new AuditLogsService();

