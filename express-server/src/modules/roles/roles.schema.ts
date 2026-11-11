import { z } from 'zod/v4';

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must not exceed 50 characters')
    .regex(/^[A-Z0-9_]+$/, 'Role name must contain only uppercase letters, numbers, and underscores'),
  description: z.string().trim().max(255).optional(),
  permissionIds: z.array(z.uuid('Invalid permission ID')).optional(),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Role name must contain only uppercase letters, numbers, and underscores')
    .optional(),
  description: z.string().trim().max(255).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const roleIdParamSchema = z.object({
  id: z.uuid('Invalid role ID'),
});

export const userRoleParamSchema = z.object({
  id: z.uuid('Invalid user ID'),
  roleId: z.uuid('Invalid role ID').optional(),
});

export const assignRoleSchema = z.object({
  roleId: z.uuid('Invalid role ID'),
});

