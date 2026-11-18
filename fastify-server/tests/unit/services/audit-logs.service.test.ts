import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditLogsService } from '../../../src/modules/audit-logs/audit-logs.service.js';
import { auditLogsRepository } from '../../../src/modules/audit-logs/audit-logs.repository.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';
import { ErrorCode } from '../../../src/common/enums/error-code.enum.js';

vi.mock('../../../src/modules/audit-logs/audit-logs.repository.js', () => ({
  auditLogsRepository: {
    create: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/services/logger.service.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AuditLogsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log (fault-isolated)', () => {
    it('creates audit log entry successfully', async () => {
      vi.mocked(auditLogsRepository.create).mockResolvedValueOnce({} as any);

      await auditLogsService.log({
        action: 'ROLE_CREATED',
        resource: 'role',
        resourceId: 'role-123',
      });

      expect(auditLogsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ROLE_CREATED' }),
      );
    });

    it('suppresses errors if database insert fails so business logic is not interrupted', async () => {
      vi.mocked(auditLogsRepository.create).mockRejectedValueOnce(new Error('DB failure'));

      await expect(
        auditLogsService.log({
          action: 'ROLE_CREATED',
          resource: 'role',
          resourceId: 'role-123',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getAuditLogById', () => {
    it('throws RESOURCE_NOT_FOUND if audit log does not exist', async () => {
      vi.mocked(auditLogsRepository.findById).mockResolvedValueOnce(null);

      await expect(auditLogsService.getAuditLogById('non-existent')).rejects.toThrowError(
        expect.objectContaining({ code: ErrorCode.RESOURCE_NOT_FOUND }),
      );
    });
  });
});
