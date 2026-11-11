import { prisma } from '../../database/prisma.client.js';
import type { RoleRecord } from './roles.types.js';

export class RolesRepository {
  async findAll(): Promise<(RoleRecord & { permissions: string[]; _count: { userRoles: number } })[]> {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      permissions: r.rolePermissions.map((rp) => rp.permission.name),
      _count: r._count,
    }));
  }

  async findById(id: string): Promise<(RoleRecord & { permissions: string[]; _count: { userRoles: number } }) | null> {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
    });

    if (!role) {
      return null;
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp) => rp.permission.name),
      _count: role._count,
    };
  }

  async findByName(name: string): Promise<RoleRecord | null> {
    return (await prisma.role.findUnique({
      where: { name },
    })) as RoleRecord | null;
  }

  async create(data: {
    name: string;
    description?: string;
    isSystem?: boolean;
    permissionIds?: string[];
  }): Promise<RoleRecord> {
    return prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          isSystem: data.isSystem ?? false,
        },
      });

      if (data.permissionIds && data.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }

      return role as RoleRecord;
    });
  }

  async update(id: string, data: { name?: string; description?: string; isActive?: boolean }): Promise<RoleRecord> {
    return (await prisma.role.update({
      where: { id },
      data,
    })) as RoleRecord;
  }

  async delete(id: string): Promise<void> {
    await prisma.role.delete({
      where: { id },
    });
  }

  async findUserRole(userId: string, roleId: string): Promise<{ id: string } | null> {
    return prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId, roleId },
      },
      select: { id: true },
    });
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<{ id: string; assignedAt: Date }> {
    return prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      select: { id: true, assignedAt: true },
    });
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });
  }

  async count(): Promise<number> {
    return prisma.role.count();
  }
}

export const rolesRepository = new RolesRepository();

