export interface DashboardStatisticsDto {
  overview: {
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    totalRoles: number;
    totalPermissions: number;
  };
  usersRecent: number;
  systemHealth: {
    status: 'healthy';
    uptime: number;
    timestamp: string;
  };
}

export interface UserStatisticsDto {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  blockedUsers: number;
  verifiedEmailUsers: number;
  unverifiedEmailUsers: number;
  recentRegistrations30Days: number;
  usersByRole: { roleName: string; count: number }[];
}

export interface RoleStatisticsDto {
  totalRoles: number;
  activeRoles: number;
  systemRoles: number;
  customRoles: number;
  roleDistribution: {
    roleId: string;
    roleName: string;
    isSystem: boolean;
    userCount: number;
    permissionCount: number;
  }[];
}

