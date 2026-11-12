import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditLogsService } from '../../../src/modules/audit-logs/audit-logs.service.js';
import { auditLogsRepository } from '../../../src/modules/audit-logs/audit-logs.repository.js';
import { logger } from '../../../src/services/logger.service.js';
import { AppError } from '../../../src/common/utils/app-error.util.js';

vi.mock('../../../src/modules/audit-logs/audit-logs.repository.js', () => ({
  auditLogsRepository: {
    create: vi.fn(),
    findMany: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/services/logger.service.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AuditLogsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('creates audit log entry successfully', async () => {
      vi.mocked(auditLogsRepository.create).mockResolvedValue({} as any);

      await auditLogsService.log({
        actorUserId: 'user-1',
        action: 'USER_CREATED',
        resource: 'user',
        status: 'SUCCESS',
      });

      expect(auditLogsRepository.create).toHaveBeenCalledWith({
        actorUserId: 'user-1',
        action: 'USER_CREATED',
        resource: 'user',
        status: 'SUCCESS',
      });
    });

    it('gracefully handles repository error without throwing exception', async () => {
      vi.mocked(auditLogsRepository.create).mockRejectedValue(new Error('Database write failure'));

      await expect(
        auditLogsService.log({
          actorUserId: 'user-1',
          action: 'USER_CREATED',
          resource: 'user',
          status: 'SUCCESS',
        }),
      ).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('delegates query to repository', async () => {
      const mockResult = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      vi.mocked(auditLogsRepository.findMany).mockResolvedValue(mockResult);

      const result = await auditLogsService.getAuditLogs({ page: 1, limit: 20 });

      expect(result).toEqual(mockResult);
      expect(auditLogsRepository.findMany).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });
  });

  describe('getAuditLogById', () => {
    it('returns audit log when found', async () => {
      const mockLog = {
        id: 'log-1',
        action: 'USER_CREATED',
        resource: 'user',
        status: 'SUCCESS',
        createdAt: '2026-11-14T00:00:00.000Z',
      };
      vi.mocked(auditLogsRepository.findById).mockResolvedValue(mockLog);

      const result = await auditLogsService.getAuditLogById('log-1');

      expect(result).toEqual(mockLog);
    });

    it('throws 404 AppError when not found', async () => {
      vi.mocked(auditLogsRepository.findById).mockResolvedValue(null);

      await expect(auditLogsService.getAuditLogById('non-existent')).rejects.toThrow(AppError);
    });
  });
});
