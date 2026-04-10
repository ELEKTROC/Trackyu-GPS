// Service d'Audit Trail centralisé
// Sprint 2 - Task 6: Audit Trail

import type { AuditEntry, AuditAction, AuditEntityType, AuditSeverity, AuditLogFilter, AuditLogSummary, AuditConfig } from '../types/audit';
import { logger } from '../utils/logger';

// Configuration par défaut
const defaultConfig: AuditConfig = {
  enabled: true,
  retentionDays: 365,
  criticalActions: [
    'DELETE', 'BULK_DELETE', 'PERIOD_LOCKED', 'PERIOD_CLOSED',
    'INVOICE_VOIDED', 'PERMISSION_CHANGED', 'PASSWORD_CHANGED'
  ],
  excludedActions: [],
  trackReadOperations: false,
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'creditCard'],
};

// État local pour le mode démo
let auditLogs: AuditEntry[] = [];
let config: AuditConfig = { ...defaultConfig };

// Générer un ID unique
const generateId = (): string => `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Masquer les champs sensibles
const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const masked = { ...data };
  for (const field of config.sensitiveFields) {
    if (field in masked) {
      masked[field] = '********';
    }
  }
  
  return masked;
};

// Déterminer la sévérité automatiquement
const determineSeverity = (action: AuditAction): AuditSeverity => {
  if (config.criticalActions.includes(action)) {
    return 'CRITICAL';
  }
  
  if (['UPDATE', 'BULK_UPDATE', 'PAYMENT_RECEIVED', 'PAYMENT_SENT', 'LOGIN_FAILED'].includes(action)) {
    return 'WARNING';
  }
  
  return 'INFO';
};

// Créer une entrée d'audit
export interface CreateAuditParams {
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  changedFields?: string[];
  description: string;
  severity?: AuditSeverity;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export const createAuditEntry = (params: CreateAuditParams): AuditEntry | null => {
  if (!config.enabled) return null;
  
  // Skip if action is excluded
  if (config.excludedActions.includes(params.action)) return null;
  
  // Skip read operations if not tracking them
  if (params.action === 'READ' && !config.trackReadOperations) return null;
  
  const now = new Date().toISOString();
  
  const entry: AuditEntry = {
    id: generateId(),
    tenantId: params.tenantId,
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entityName: params.entityName,
    previousValue: maskSensitiveData(params.previousValue),
    newValue: maskSensitiveData(params.newValue),
    changedFields: params.changedFields,
    severity: params.severity || determineSeverity(params.action),
    description: params.description,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    sessionId: params.sessionId,
    metadata: params.metadata,
    timestamp: now,
    createdAt: now,
  };
  
  auditLogs.unshift(entry); // Add to beginning
  
  // Log critical actions to console
  if (entry.severity === 'CRITICAL') {
    logger.warn('[AUDIT CRITICAL]', entry.description, entry);
  }
  
  return entry;
};

// Raccourcis pour les opérations courantes
export const auditCreate = (
  context: { tenantId: string; userId: string; userName: string; userEmail: string; userRole: string },
  entityType: AuditEntityType,
  entityId: string,
  entityName: string,
  data?: any
) => {
  return createAuditEntry({
    ...context,
    action: 'CREATE',
    entityType,
    entityId,
    entityName,
    newValue: data,
    description: `${context.userName} a créé ${entityType.toLowerCase()} "${entityName}"`,
  });
};

export const auditUpdate = (
  context: { tenantId: string; userId: string; userName: string; userEmail: string; userRole: string },
  entityType: AuditEntityType,
  entityId: string,
  entityName: string,
  previousValue: any,
  newValue: any,
  changedFields?: string[]
) => {
  return createAuditEntry({
    ...context,
    action: 'UPDATE',
    entityType,
    entityId,
    entityName,
    previousValue,
    newValue,
    changedFields,
    description: `${context.userName} a modifié ${entityType.toLowerCase()} "${entityName}"${changedFields?.length ? ` (${changedFields.join(', ')})` : ''}`,
  });
};

export const auditDelete = (
  context: { tenantId: string; userId: string; userName: string; userEmail: string; userRole: string },
  entityType: AuditEntityType,
  entityId: string,
  entityName: string,
  data?: any
) => {
  return createAuditEntry({
    ...context,
    action: 'DELETE',
    entityType,
    entityId,
    entityName,
    previousValue: data,
    description: `${context.userName} a supprimé ${entityType.toLowerCase()} "${entityName}"`,
    severity: 'CRITICAL',
  });
};

// Audit pour les opérations de période comptable
export const auditPeriodAction = (
  context: { tenantId: string; userId: string; userName: string; userEmail: string; userRole: string },
  action: 'close' | 'lock' | 'reopen',
  periodName: string,
  periodId: string,
  reason?: string
) => {
  const actionMap: Record<string, { action: AuditAction; desc: string }> = {
    close: { action: 'PERIOD_CLOSED', desc: 'a clôturé la période' },
    lock: { action: 'PERIOD_LOCKED', desc: 'a verrouillé la période' },
    reopen: { action: 'PERIOD_REOPENED', desc: 'a réouvert la période' },
  };
  
  const { action: auditAction, desc } = actionMap[action];
  
  return createAuditEntry({
    ...context,
    action: auditAction,
    entityType: 'ACCOUNTING_PERIOD',
    entityId: periodId,
    entityName: periodName,
    description: `${context.userName} ${desc} ${periodName}${reason ? ` - Motif: ${reason}` : ''}`,
    severity: 'CRITICAL',
  });
};

// Audit pour les paiements
export const auditPayment = (
  context: { tenantId: string; userId: string; userName: string; userEmail: string; userRole: string },
  type: 'received' | 'sent',
  paymentId: string,
  amount: number,
  clientName: string,
  invoiceRefs?: string[]
) => {
  return createAuditEntry({
    ...context,
    action: type === 'received' ? 'PAYMENT_RECEIVED' : 'PAYMENT_SENT',
    entityType: 'PAYMENT',
    entityId: paymentId,
    entityName: `Paiement ${amount.toFixed(2)}`,
    description: `${context.userName} a enregistré un paiement ${type === 'received' ? 'reçu de' : 'envoyé à'} ${clientName} (${amount.toFixed(2)})${invoiceRefs?.length ? ` - Factures: ${invoiceRefs.join(', ')}` : ''}`,
    metadata: { amount, clientName, invoiceRefs },
  });
};

// Audit pour les connexions
export const auditLogin = (
  tenantId: string,
  userId: string,
  userName: string,
  userEmail: string,
  userRole: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  failReason?: string
) => {
  return createAuditEntry({
    tenantId,
    userId,
    userName,
    userEmail,
    userRole,
    action: success ? 'LOGIN' : 'LOGIN_FAILED',
    entityType: 'USER',
    entityId: userId,
    entityName: userName,
    description: success 
      ? `${userName} s'est connecté avec succès` 
      : `Tentative de connexion échouée pour ${userEmail}${failReason ? ` - ${failReason}` : ''}`,
    severity: success ? 'INFO' : 'WARNING',
    ipAddress,
    userAgent,
  });
};

// Récupérer les logs avec filtres
export const getAuditLogs = async (
  tenantId: string,
  filters?: AuditLogFilter,
  page: number = 1,
  pageSize: number = 50
): Promise<{ entries: AuditEntry[]; total: number; page: number; totalPages: number }> => {
  let filtered = auditLogs.filter(log => log.tenantId === tenantId);
  
  if (filters) {
    if (filters.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
    }
    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }
    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }
    if (filters.entityType) {
      filtered = filtered.filter(log => log.entityType === filters.entityType);
    }
    if (filters.entityId) {
      filtered = filtered.filter(log => log.entityId === filters.entityId);
    }
    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.description.toLowerCase().includes(term) ||
        log.userName.toLowerCase().includes(term) ||
        log.entityName?.toLowerCase().includes(term)
      );
    }
  }
  
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const entries = filtered.slice(start, start + pageSize);
  
  return { entries, total, page, totalPages };
};

// Obtenir un résumé des logs
export const getAuditSummary = async (
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<AuditLogSummary> => {
  let filtered = auditLogs.filter(log => log.tenantId === tenantId);
  
  if (startDate) {
    filtered = filtered.filter(log => log.timestamp >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(log => log.timestamp <= endDate);
  }
  
  const byAction: Record<string, number> = {};
  const byEntityType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  
  for (const log of filtered) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
    byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
    bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
  }
  
  return {
    totalEntries: filtered.length,
    byAction: byAction as any,
    byEntityType: byEntityType as any,
    bySeverity: bySeverity as any,
    recentActivity: filtered.slice(0, 10),
  };
};

// Exporter les logs (pour backup ou analyse)
export const exportAuditLogs = async (
  tenantId: string,
  filters?: AuditLogFilter
): Promise<AuditEntry[]> => {
  const { entries } = await getAuditLogs(tenantId, filters, 1, 10000);
  return entries;
};

// Configuration
export const getAuditConfig = (): AuditConfig => ({ ...config });

export const setAuditConfig = (newConfig: Partial<AuditConfig>) => {
  config = { ...config, ...newConfig };
};

// Export pour les tests
export const __resetAuditLogs = () => {
  auditLogs = [];
};

export const __getAuditLogs = () => auditLogs;

export const __setAuditLogs = (logs: AuditEntry[]) => {
  auditLogs = logs;
};
