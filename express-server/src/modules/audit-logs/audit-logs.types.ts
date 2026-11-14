export interface AuditLogRecord {
  id: string;
  actorUserId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface CreateAuditLogEntry {
  actorUserId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  status: 'SUCCESS' | 'FAILURE';
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogResponseDto {
  id: string;
  actorUserId: string | null;
  actor?: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  action: string;
  resource: string;
  resourceId: string | null;
  status: string;
  ipAddress: string | null;
  userAgent: string | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogQueryFilter {
  page?: number;
  limit?: number;
  actorUserId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  status?: string;
  correlationId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedAuditLogsResult {
  items: AuditLogResponseDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

