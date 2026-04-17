/**
 * TrackYu Mobile — Tickets API (Staff / Support)
 * Aligne avec /api/tickets (backend ticketRoutes.ts)
 * GET /tickets       → requirePermission('VIEW_TICKETS') → paginated { data, total, page, limit, totalPages }
 * GET /tickets/:id   → retourne ticket + messages[] directement
 * POST /tickets/:id/messages → { sender, text, is_internal? } → requirePermission('VIEW_TICKETS')
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TicketMessage {
  id: string;
  sender: string;
  text: string;
  date: string;
  isInternal: boolean;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  sub_category: string | null;
  assigned_to: string | null;
  assigned_user_name: string | null;
  client_id: string | null;
  client_name: string | null;
  reseller_name: string | null;
  vehicle_id: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  messages?: TicketMessage[];
}

export interface TicketsPage {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketCategory {
  id: number;
  name: string;
  icon?: string;
  default_priority?: string;
  is_hidden?: boolean;
}

export interface TicketSubCategory {
  id: number;
  category_id: number;
  name: string;
  default_priority?: string;
}

const ticketsApi = {
  getAll: async (params?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<TicketsPage> => {
    try {
      const res = await apiClient.get('/tickets', { params: { page: 1, limit: 50, ...params } });
      const raw = res.data;
      if (Array.isArray(raw)) {
        return { data: raw, total: raw.length, page: 1, limit: raw.length, totalPages: 1 };
      }
      return {
        data: Array.isArray(raw?.data) ? raw.data : [],
        total: raw?.total ?? 0,
        page: raw?.page ?? 1,
        limit: raw?.limit ?? 50,
        totalPages: raw?.totalPages ?? 1,
      };
    } catch (e) {
      throw normalizeError(e);
    }
  },

  getById: async (id: string): Promise<Ticket> => {
    try {
      const res = await apiClient.get(`/tickets/${id}`);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  update: async (id: string, data: Partial<Pick<Ticket, 'status' | 'priority' | 'assigned_to'>>): Promise<Ticket> => {
    try {
      const res = await apiClient.put(`/tickets/${id}`, data);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  addMessage: async (id: string, text: string, sender: string, is_internal = false): Promise<TicketMessage> => {
    try {
      const res = await apiClient.post(`/tickets/${id}/messages`, { sender, text, is_internal });
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  getCategories: async (): Promise<TicketCategory[]> => {
    try {
      const res = await apiClient.get('/support/settings/categories');
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      return raw.filter((c: TicketCategory) => !c.is_hidden);
    } catch (e) {
      throw normalizeError(e);
    }
  },

  getSubCategories: async (categoryId: number): Promise<TicketSubCategory[]> => {
    try {
      const res = await apiClient.get('/support/settings/subcategories', { params: { categoryId } });
      const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      return raw;
    } catch (e) {
      throw normalizeError(e);
    }
  },

  create: async (payload: {
    subject: string;
    description: string;
    priority: TicketPriority;
    category?: string;
    sub_category?: string;
    vehicle_id?: string;
  }): Promise<Ticket> => {
    try {
      const res = await apiClient.post('/tickets', payload);
      return res.data;
    } catch (e) {
      throw normalizeError(e);
    }
  },
};

export default ticketsApi;
