/**
 * TrackYu Mobile — Admin API
 * Endpoints réservés SUPERADMIN / ADMIN :
 *   - Corbeille (trash)
 *   - Journaux d'audit (audit-logs)
 *   - Pipeline GPS / diagnostics boîtiers
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

// ── Trash ─────────────────────────────────────────────────────────────────────

export interface TrashUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  deleted_at?: string;
}
export interface TrashContract {
  id: string;
  contract_number?: string;
  client_name?: string;
  vehicle_plate?: string;
  deleted_at?: string;
}
export interface TrashTenant {
  id: string;
  name?: string;
  slug?: string;
  contact_email?: string;
  deleted_at?: string;
}
export interface TrashData {
  users: TrashUser[];
  contracts: TrashContract[];
  tenants: TrashTenant[];
  totals: { users: number; contracts: number; tenants: number; total: number };
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  created_at?: string;
  timestamp?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  ip_address?: string;
  details?: Record<string, unknown>;
}

// ── GPS Pipeline ──────────────────────────────────────────────────────────────

export interface GpsParserStat {
  name: string;
  totalPackets: number;
  validPackets: number;
  rejectedPackets: number;
  crcErrors: number;
  successRate: number;
  lastSeen: string | null;
}
export interface GpsPipelineStats {
  timestamp: string;
  pipeline: {
    activeConnections: number;
    activeParsers: string[];
    rateLimit: { maxPerSec: number; trackedImeis: number };
  };
  parsers: GpsParserStat[];
  unknownImeis: { imei: string; packetCount: number; lastSeen: string }[];
  totals: { packets: number; valid: number; rejected: number; crcErrors: number };
}

export interface DeviceDiagnostic {
  imei: string;
  protocol: string | null;
  vehicleName: string | null;
  vehiclePlate: string | null;
  model: string | null;
  status: string | null;
  isConnected: boolean;
  lastFix: string | null;
  lastPosition: { lat: number; lng: number } | null;
  lastSpeed: number | null;
  batteryMv: number | null;
  satellites: number | null;
  signalQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN';
  packetsToday: number;
  gt06Variant: string;
  operator: string | null;
  phoneNumber: string | null;
}

// ── API ───────────────────────────────────────────────────────────────────────

const adminApi = {
  // Trash
  trash: {
    list: async (): Promise<TrashData> => {
      try {
        const res = await apiClient.get<TrashData>('/trash');
        return res.data;
      } catch (error) {
        throw normalizeError(error);
      }
    },
    restore: async (entityType: string, entityId: string): Promise<void> => {
      try {
        await apiClient.post(`/trash/${entityType}/${entityId}/restore`);
      } catch (error) {
        throw normalizeError(error);
      }
    },
  },

  // Audit Logs
  auditLogs: {
    list: async (params?: {
      limit?: number;
      offset?: number;
      user_id?: string;
      action?: string;
      entity_type?: string;
      from?: string;
      to?: string;
    }): Promise<AuditLog[]> => {
      try {
        const res = await apiClient.get<AuditLog[] | { data: AuditLog[] }>('/audit-logs', {
          params: { limit: 100, ...params },
        });
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray((res.data as { data: AuditLog[] }).data)) return (res.data as { data: AuditLog[] }).data;
        return [];
      } catch (error) {
        throw normalizeError(error);
      }
    },
  },

  // GPS Pipeline
  gps: {
    getStats: async (): Promise<GpsPipelineStats> => {
      const res = await apiClient.get<GpsPipelineStats>('/admin/gps-stats');
      return res.data;
    },
    getDiagnostic: async (imei: string): Promise<DeviceDiagnostic> => {
      const res = await apiClient.get<DeviceDiagnostic>(`/devices/${imei}/diagnostics`);
      return res.data;
    },
  },
};

export default adminApi;
