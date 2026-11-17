import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  actorUserId: z.string().uuid('Invalid actor user ID').optional(),
  action: z.string().trim().optional(),
  resource: z.string().trim().optional(),
  resourceId: z.string().trim().optional(),
  status: z.enum(['SUCCESS', 'FAILURE']).optional(),
  correlationId: z.string().trim().optional(),
  startDate: z.string().datetime({ message: 'Invalid start date format' }).optional(),
  endDate: z.string().datetime({ message: 'Invalid end date format' }).optional(),
});

export const auditLogIdParamSchema = z.object({
  id: z.string().uuid('Invalid audit log ID'),
});
