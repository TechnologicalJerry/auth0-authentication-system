import { prisma } from '../../database/prisma.client.js';
import type {
  ApplicationUserRecord,
  CurrentUserContext,
  UserQueryFilter,
  PaginatedResult,
} from './users.types.js';

export class UsersRepository {
  async findById(id: string): Promise<ApplicationUserRecord | null> {
    return (await prisma.applicationUser.findUnique({
      where: { id },
    })) as ApplicationUserRecord | null;
  }

  async findByAuth0UserId(auth0UserId: string): Promise<ApplicationUserRecord | null> {
    return (await prisma.applicationUser.findUnique({
      where: { auth0UserId },
    })) as ApplicationUserRecord | null;
  }

  async findByEmail(email: string): Promise<ApplicationUserRecord | null> {
    return (await prisma.applicationUser.findUnique({
      where: { email },
    })) as ApplicationUserRecord | null;
  }

  async getUserContext(auth0UserId: string): Promise<CurrentUserContext | null> {
    const user = await prisma.applicationUser.findUnique({
      where: { auth0UserId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    for (const ur of user.userRoles) {
      if (ur.role.isActive) {
        roles.push(ur.role.name);
        for (const rp of ur.role.rolePermissions) {
          permissionsSet.add(rp.permission.name);
        }
      }
    }

    return {
      id: user.id,
      auth0UserId: user.auth0UserId,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      roles,
      permissions: Array.from(permissionsSet),
    };
  }

  async upsertFromAuth0(data: {
    auth0UserId: string;
    email: string;
    emailVerified?: boolean;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    profilePicture?: string;
  }): Promise<ApplicationUserRecord> {
    const now = new Date();

    return (await prisma.applicationUser.upsert({
      where: { auth0UserId: data.auth0UserId },
      create: {
        auth0UserId: data.auth0UserId,
        email: data.email,
        emailVerified: data.emailVerified ?? false,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        displayName: data.displayName ?? null,
        profilePicture: data.profilePicture ?? null,
        lastLoginAt: now,
      },
      update: {
        email: data.email,
        ...(data.emailVerified !== undefined && { emailVerified: data.emailVerified }),
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.profilePicture !== undefined && { profilePicture: data.profilePicture }),
        lastLoginAt: now,
      },
    })) as ApplicationUserRecord;
  }

  async update(id: string, data: Partial<ApplicationUserRecord>): Promise<ApplicationUserRecord> {
    return (await prisma.applicationUser.update({
      where: { id },
      data,
    })) as ApplicationUserRecord;
  }

  async findMany(query: UserQueryFilter): Promise<PaginatedResult<ApplicationUserRecord & { roles: string[] }>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.isActive !== undefined) {
      where['isActive'] = query.isActive;
    }

    if (query.isBlocked !== undefined) {
      where['isBlocked'] = query.isBlocked;
    }

    if (query.search) {
      where['OR'] = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where['userRoles'] = {
        some: {
          role: {
            name: query.role,
          },
        },
      };
    }

    const [total, users] = await Promise.all([
      prisma.applicationUser.count({ where }),
      prisma.applicationUser.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      auth0UserId: u.auth0UserId,
      email: u.email,
      emailVerified: u.emailVerified,
      firstName: u.firstName,
      lastName: u.lastName,
      displayName: u.displayName,
      profilePicture: u.profilePicture,
      isActive: u.isActive,
      isBlocked: u.isBlocked,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      roles: u.userRoles.map((ur) => ur.role.name),
    }));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return prisma.applicationUser.count({ where });
  }
}

export const usersRepository = new UsersRepository();

