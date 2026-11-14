import { z } from 'zod/v4';

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  actorUserId: z.uuid('Invalid actor user ID').optional(),
  action: z.string().trim().optional(),
  resource: z.string().trim().optional(),
  resourceId: z.string().trim().optional(),
  status: z.enum(['SUCCESS', 'FAILURE']).optional(),
  correlationId: z.string().trim().optional(),
  startDate: z.isoDateTime('Invalid start date format').optional(),
  endDate: z.isoDateTime('Invalid end date format').optional(),
});

export const auditLogIdParamSchema = z.object({
  id: z.uuid('Invalid audit log ID'),
});

