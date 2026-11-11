import { prisma } from '../../database/prisma.client.js';
import type { PermissionRecord } from './permissions.types.js';

export class PermissionsRepository {
  async findAll(): Promise<PermissionRecord[]> {
    return (await prisma.permission.findMany({
      orderBy: { name: 'asc' },
    })) as PermissionRecord[];
  }

  async findByIds(ids: string[]): Promise<PermissionRecord[]> {
    return (await prisma.permission.findMany({
      where: {
        id: { in: ids },
      },
    })) as PermissionRecord[];
  }

  async findByRoleId(roleId: string): Promise<PermissionRecord[]> {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
      orderBy: {
        permission: { name: 'asc' },
      },
    });

    return rolePermissions.map((rp) => rp.permission as PermissionRecord);
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Remove existing permissions assigned to this role
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Insert new permission mappings
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  async count(): Promise<number> {
    return prisma.permission.count();
  }
}

export const permissionsRepository = new PermissionsRepository();

