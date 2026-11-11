import { prisma } from '../../database/prisma.client.js';
import type {
  DashboardStatisticsDto,
  UserStatisticsDto,
  RoleStatisticsDto,
} from './admin.types.js';

export class AdminService {
  async getDashboardStatistics(): Promise<DashboardStatisticsDto> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, blockedUsers, totalRoles, totalPermissions, usersRecent] =
      await Promise.all([
        prisma.applicationUser.count(),
        prisma.applicationUser.count({ where: { isActive: true, isBlocked: false } }),
        prisma.applicationUser.count({ where: { isBlocked: true } }),
        prisma.role.count(),
        prisma.permission.count(),
        prisma.applicationUser.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ]);

    return {
      overview: {
        totalUsers,
        activeUsers,
        blockedUsers,
        totalRoles,
        totalPermissions,
      },
      usersRecent,
      systemHealth: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  async getUserStatistics(): Promise<UserStatisticsDto> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      blockedUsers,
      verifiedEmailUsers,
      unverifiedEmailUsers,
      recentRegistrations30Days,
      rolesWithUsers,
    ] = await Promise.all([
      prisma.applicationUser.count(),
      prisma.applicationUser.count({ where: { isActive: true } }),
      prisma.applicationUser.count({ where: { isActive: false } }),
      prisma.applicationUser.count({ where: { isBlocked: true } }),
      prisma.applicationUser.count({ where: { emailVerified: true } }),
      prisma.applicationUser.count({ where: { emailVerified: false } }),
      prisma.applicationUser.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.role.findMany({
        select: {
          name: true,
          _count: {
            select: { userRoles: true },
          },
        },
      }),
    ]);

    const usersByRole = rolesWithUsers.map((r) => ({
      roleName: r.name,
      count: r._count.userRoles,
    }));

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      blockedUsers,
      verifiedEmailUsers,
      unverifiedEmailUsers,
      recentRegistrations30Days,
      usersByRole,
    };
  }

  async getRoleStatistics(): Promise<RoleStatisticsDto> {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const totalRoles = roles.length;
    const activeRoles = roles.filter((r) => r.isActive).length;
    const systemRoles = roles.filter((r) => r.isSystem).length;
    const customRoles = totalRoles - systemRoles;

    const roleDistribution = roles.map((r) => ({
      roleId: r.id,
      roleName: r.name,
      isSystem: r.isSystem,
      userCount: r._count.userRoles,
      permissionCount: r._count.rolePermissions,
    }));

    return {
      totalRoles,
      activeRoles,
      systemRoles,
      customRoles,
      roleDistribution,
    };
  }
}

export const adminService = new AdminService();

