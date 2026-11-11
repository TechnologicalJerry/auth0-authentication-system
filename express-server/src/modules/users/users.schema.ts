import { z } from 'zod/v4';

export const updateUserProfileSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  displayName: z.string().trim().max(100).optional(),
  profilePicture: z.url().optional().or(z.literal('')),
});

export const adminUpdateUserSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  displayName: z.string().trim().max(100).optional(),
  profilePicture: z.url().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
}).refine((data) => data.isActive !== undefined || data.isBlocked !== undefined, {
  message: 'At least one of isActive or isBlocked must be provided',
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  isBlocked: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  role: z.string().trim().optional(),
});

export const userIdParamSchema = z.object({
  id: z.uuid('Invalid user ID format'),
});

