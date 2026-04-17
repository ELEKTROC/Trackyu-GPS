/**
 * TrackYu Mobile — Audit Logs API
 * GET /audit-logs → requireRole('ADMIN', 'SUPERADMIN')
 * Paramètres : action, entityType, dateFrom, dateTo, userId, tenantId, status, limit, page
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'VIEW'
  | 'SECURITY';

export type AuditEntityType =
  | 'USER'
  | 'VEHICLE'
  | 'CLIENT'
  | 'INVOICE'
  | 'INTERVENTION'
  | 'GEOFENCE'
  | 'DEVICE'
  | 'ROLE'
  | 'SETTINGS'
  | 'SESSION'
  | 'REPORT';

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  duration: number | null;
}

export interface AuditLogsPage {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogsParams {
  action?: AuditAction;
  entityType?: AuditEntityType;
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  userId?: string;
  tenantId?: string;
  status?: 'SUCCESS' | 'FAILURE' | 'WARNING';
  search?: string;
  page?: number;
  limit?: number;
}

const auditLogsApi = {
  getAll: async (params?: AuditLogsParams): Promise<AuditLog[]> => {
    try {
      const res = await apiClient.get('/audit-logs', {
        params: { page: 1, limit: 500, ...params },
      });
      const raw = res.data;
      // Accepte { data: [] } ou tableau direct
      if (Array.isArray(raw)) return raw;
      if (Array.isArray(raw?.data)) return raw.data;
      return [];
    } catch (e) {
      throw normalizeError(e);
    }
  },

  getPaginated: async (params?: AuditLogsParams): Promise<AuditLogsPage> => {
    try {
      const res = await apiClient.get('/audit-logs', {
        params: { page: 1, limit: 100, ...params },
      });
      const raw = res.data;
      if (Array.isArray(raw)) {
        return { data: raw, total: raw.length, page: 1, limit: raw.length, totalPages: 1 };
      }
      return {
        data: Array.isArray(raw?.data) ? raw.data : [],
        total: raw?.total ?? 0,
        page: raw?.page ?? 1,
        limit: raw?.limit ?? 100,
        totalPages: raw?.totalPages ?? 1,
      };
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default auditLogsApi;
