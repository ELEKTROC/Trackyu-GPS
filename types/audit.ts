export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'BULK_DELETE'
  | 'BULK_UPDATE'
  | 'VIEW'
  | 'READ'
  | 'EXPORT'
  | 'IMPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PERIOD_LOCKED'
  | 'PERIOD_CLOSED'
  | 'PERIOD_REOPENED'
  | 'INVOICE_VOIDED'
  | 'PERMISSION_CHANGED'
  | 'PASSWORD_CHANGED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_SENT';

export type AuditEntityType =
  | 'INVOICE'
  | 'PAYMENT'
  | 'VEHICLE'
  | 'DRIVER'
  | 'USER'
  | 'TENANT'
  | 'CONTRACT'
  | 'ACCOUNTING_PERIOD'
  | 'STOCK'
  | 'INTERVENTION';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'WARNING' | 'INFO';

export interface AuditEntry {
  id: string;
  timestamp: string;
  createdAt?: string;
  tenantId?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  previousData?: unknown;
  previousValue?: unknown;
  newData?: unknown;
  newValue?: unknown;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
  severity: AuditSeverity;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  sessionId?: string;
}

export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  entityId?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogSummary {
  totalEntries: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  bySeverity?: Record<string, number>;
  recentActivity?: AuditEntry[];
}

export interface AuditConfig {
  enabled: boolean;
  retentionDays: number;
  criticalActions: string[];
  excludedActions: string[];
  trackReadOperations: boolean;
  sensitiveFields: string[];
}
