import { prisma } from '../../database/prisma.client.js';
import type {
  CreateAuditLogEntry,
  AuditLogQueryFilter,
  PaginatedAuditLogsResult,
  AuditLogResponseDto,
} from './audit-logs.types.js';

export class AuditLogsRepository {
  async create(entry: CreateAuditLogEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        status: entry.status,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        correlationId: entry.correlationId ?? null,
        metadata: entry.metadata ? (entry.metadata as any) : undefined,
      },
    });
  }

  async findMany(query: AuditLogQueryFilter): Promise<PaginatedAuditLogsResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.actorUserId) where['actorUserId'] = query.actorUserId;
    if (query.action) where['action'] = query.action;
    if (query.resource) where['resource'] = query.resource;
    if (query.resourceId) where['resourceId'] = query.resourceId;
    if (query.status) where['status'] = query.status;
    if (query.correlationId) where['correlationId'] = query.correlationId;

    if (query.startDate || query.endDate) {
      where['createdAt'] = {
        ...(query.startDate && { gte: new Date(query.startDate) }),
        ...(query.endDate && { lte: new Date(query.endDate) }),
      };
    }

    const [total, records] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      }),
    ]);

    const items: AuditLogResponseDto[] = records.map((r) => ({
      id: r.id,
      actorUserId: r.actorUserId,
      actor: r.actor,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      status: r.status,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      correlationId: r.correlationId,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt.toISOString(),
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

  async findById(id: string): Promise<AuditLogResponseDto | null> {
    const record = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      actorUserId: record.actorUserId,
      actor: record.actor,
      action: record.action,
      resource: record.resource,
      resourceId: record.resourceId,
      status: record.status,
      ipAddress: record.ipAddress,
      userAgent: record.userAgent,
      correlationId: record.correlationId,
      metadata: record.metadata as Record<string, unknown> | null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

export const auditLogsRepository = new AuditLogsRepository();

