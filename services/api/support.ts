// services/api/support.ts — Support domain: tickets, faq, ai assistant, internal chat
import {
  USE_MOCK,
  NETWORK_DELAY,
  API_URL,
  DB_KEYS,
  db,
  sleep,
  filterByTenant,
  getHeaders,
  handleAuthError
} from './client';
import { logger } from '../../utils/logger';
import type { Ticket, TicketMessage } from '../../types';

export function createSupportApi(lazyApi: () => any) {
  return {
    // --- TICKETS ---
    tickets: {
      list: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        priority?: string;
        category?: string;
        assigned_to?: string;
        client_id?: string;
        date_from?: string;
        date_to?: string;
        tenantId?: string;
      }): Promise<{ data: Ticket[]; total: number; page: number; limit: number; totalPages: number }> => {
        if (USE_MOCK) {
          const data = db.get(DB_KEYS.TICKETS, [] as Ticket[]);
          return { data, total: data.length, page: 1, limit: 50, totalPages: 1 };
        }
        try {
          const qs = new URLSearchParams();
          if (params?.page)        qs.set('page',        String(params.page));
          if (params?.limit)       qs.set('limit',       String(params.limit));
          if (params?.search)      qs.set('search',      params.search);
          if (params?.status)      qs.set('status',      params.status);
          if (params?.priority)    qs.set('priority',    params.priority);
          if (params?.category)    qs.set('category',    params.category);
          if (params?.assigned_to) qs.set('assigned_to', params.assigned_to);
          if (params?.client_id)   qs.set('client_id',   params.client_id);
          if (params?.date_from)   qs.set('date_from',   params.date_from);
          if (params?.date_to)     qs.set('date_to',     params.date_to);

          const url = `${API_URL}/tickets${qs.toString() ? `?${qs}` : ''}`;
          const response = await fetch(url, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch tickets');
          const raw = await response.json();

          const mapTicket = (t: any): Ticket => ({
            id: t.id,
            tenantId: t.tenant_id,
            clientId: t.client_id,
            clientName: t.client_name,
            vehicleId: t.vehicle_id,
            subject: t.subject,
            description: t.description,
            status: t.status,
            priority: t.priority,
            category: t.category,
            subCategory: t.sub_category,
            interventionType: t.intervention_type,
            messages: t.messages ? t.messages.map((m: any) => ({
              id: m.id, sender: m.sender, text: m.text, date: new Date(m.date)
            })) : [],
            assignedTo: t.assigned_to,
            assignedUserName: t.assigned_user_name,
            createdBy: t.created_by || undefined,
            createdByName: t.created_by_name || undefined,
            startedAt: t.first_response_at ? new Date(t.first_response_at) : undefined,
            resolvedAt: t.resolved_at ? new Date(t.resolved_at) : undefined,
            firstResponseAt: t.first_response_at ? new Date(t.first_response_at) : undefined,
            dueDate: t.due_date || undefined,
            source: t.source,
            receivedAt: t.received_at ? new Date(t.received_at) : undefined,
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at),
            escalationCount: t.escalation_count || 0,
            escalatedAt: t.escalated_at ? new Date(t.escalated_at) : undefined,
            escalatedBy: t.escalated_by || undefined,
          });

          // Handle both paginated response { data, total, page, limit, totalPages }
          // and legacy array response for backward compat
          if (Array.isArray(raw)) {
            const data = raw.map(mapTicket);
            return { data, total: data.length, page: 1, limit: data.length || 50, totalPages: 1 };
          }
          return {
            data: (raw.data || []).map(mapTicket),
            total: raw.total || 0,
            page: raw.page || 1,
            limit: raw.limit || 50,
            totalPages: raw.totalPages || 1,
          };
        } catch (e) {
          logger.warn('API Error (tickets), falling back to mock data:', e);
          const data = db.get(DB_KEYS.TICKETS, [] as Ticket[]);
          return { data, total: data.length, page: 1, limit: 50, totalPages: 1 };
        }
      },
      create: async (ticket: Ticket): Promise<Ticket> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const tickets = db.get(DB_KEYS.TICKETS, [] as Ticket[]);
          const newTicket = { ...ticket, id: `TCK-${Date.now()}`, createdAt: new Date(), updatedAt: new Date() };
          tickets.push(newTicket);
          db.save(DB_KEYS.TICKETS, tickets);
          return newTicket;
        }
        try {
          const payload = {
            client_id: ticket.clientId,
            vehicle_id: ticket.vehicleId || null,
            subject: ticket.subject,
            description: ticket.description || null,
            status: ticket.status || 'OPEN',
            priority: ticket.priority || 'MEDIUM',
            category: ticket.category || null,
            sub_category: ticket.subCategory || null,
            intervention_type: ticket.interventionType || null,
            assigned_to: ticket.assignedTo || null,
            due_date: ticket.dueDate || null,
            tags: ticket.tags || null,
            source: ticket.source || 'TrackYu',
            received_at: ticket.receivedAt ? new Date(ticket.receivedAt).toISOString() : new Date().toISOString()
          };
          const response = await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            logger.error('Create ticket error:', errorData);
            throw new Error(errorData.error || 'Failed to create ticket');
          }
          const rawData = await response.json();
          return {
            ...rawData,
            id: rawData.id,
            clientId: rawData.client_id,
            vehicleId: rawData.vehicle_id,
            subject: rawData.subject,
            description: rawData.description,
            status: rawData.status,
            priority: rawData.priority,
            category: rawData.category,
            subCategory: rawData.sub_category,
            interventionType: rawData.intervention_type,
            assignedTo: rawData.assigned_to,
            dueDate: rawData.due_date,
            tags: rawData.tags,
            createdBy: rawData.created_by || undefined,
            createdByName: rawData.created_by_name || undefined,
            source: rawData.source,
            receivedAt: rawData.received_at ? new Date(rawData.received_at) : undefined,
            createdAt: new Date(rawData.created_at),
            updatedAt: new Date(rawData.updated_at),
            escalationCount: rawData.escalation_count || 0,
            escalatedAt: rawData.escalated_at ? new Date(rawData.escalated_at) : undefined,
            escalatedBy: rawData.escalated_by || undefined,
            messages: rawData.messages ? rawData.messages.map((m: any) => ({
              id: m.id,
              sender: m.sender,
              text: m.text,
              date: new Date(m.date)
            })) : []
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (ticket: Ticket): Promise<Ticket> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const tickets = db.get(DB_KEYS.TICKETS, [] as Ticket[]);
          const index = tickets.findIndex(t => t.id === ticket.id);
          if (index !== -1) {
            tickets[index] = { ...ticket, updatedAt: new Date() };
            db.save(DB_KEYS.TICKETS, tickets);
            return tickets[index];
          }
          throw new Error('Ticket not found');
        }
        try {
          const payload = {
            client_id: ticket.clientId,
            vehicle_id: ticket.vehicleId || null,
            subject: ticket.subject,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category,
            sub_category: ticket.subCategory,
            intervention_type: ticket.interventionType || null,
            assigned_to: ticket.assignedTo || null,
            due_date: ticket.dueDate || null,
            source: ticket.source || null,
            received_at: ticket.receivedAt ? new Date(ticket.receivedAt).toISOString() : null
          };
          const response = await fetch(`${API_URL}/tickets/${ticket.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('Failed to update ticket');
          const rawData = await response.json();
          return {
            id: rawData.id,
            tenantId: rawData.tenant_id,
            clientId: rawData.client_id,
            clientName: rawData.client_name,
            vehicleId: rawData.vehicle_id,
            subject: rawData.subject,
            description: rawData.description,
            status: rawData.status,
            priority: rawData.priority,
            category: rawData.category,
            subCategory: rawData.sub_category,
            interventionType: rawData.intervention_type,
            assignedTo: rawData.assigned_to,
            assignedUserName: rawData.assigned_user_name,
            createdBy: rawData.created_by || undefined,
            createdByName: rawData.created_by_name || undefined,
            startedAt: rawData.first_response_at ? new Date(rawData.first_response_at) : undefined,
            resolvedAt: rawData.resolved_at ? new Date(rawData.resolved_at) : undefined,
            firstResponseAt: rawData.first_response_at ? new Date(rawData.first_response_at) : undefined,
            dueDate: rawData.due_date,
            source: rawData.source,
            receivedAt: rawData.received_at ? new Date(rawData.received_at) : undefined,
            tags: rawData.tags,
            createdAt: new Date(rawData.created_at),
            updatedAt: new Date(rawData.updated_at),
            messages: rawData.messages ? rawData.messages.map((m: any) => ({
              id: m.id,
              sender: m.sender,
              text: m.text,
              date: new Date(m.date || m.created_at)
            })) : []
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const tickets = db.get(DB_KEYS.TICKETS, [] as Ticket[]);
          const filtered = tickets.filter(t => t.id !== id);
          db.save(DB_KEYS.TICKETS, filtered);
          return;
        }
        try {
          const response = await fetch(`${API_URL}/tickets/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to delete ticket');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      bulkUpdate: async (
        ids: string[],
        updates: { status?: string; priority?: string; assigned_to?: string | null }
      ): Promise<{ updated: number; ids: string[] }> => {
        try {
          const response = await fetch(`${API_URL}/tickets/bulk`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify({ ids, updates }),
          });
          if (!response.ok) throw new Error('Failed to bulk update tickets');
          return response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      // Attachments
      getAttachments: async (ticketId: string): Promise<any[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return [];
        }
        try {
          const response = await fetch(`${API_URL}/tickets/${ticketId}/attachments`, {
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to fetch attachments');
          const rows = await response.json();
          return rows.map((r: any) => ({
            id: r.id,
            ticketId: r.ticket_id,
            fileName: r.file_name,
            fileUrl: r.file_url?.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${r.file_url}` : r.file_url,
            fileType: r.file_type,
            fileSize: r.file_size || 0,
            uploadedBy: r.uploaded_by,
            uploadedAt: r.created_at,
          }));
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      addAttachment: async (ticketId: string, formData: FormData): Promise<any> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { id: `ATT-${Date.now()}`, ticketId, fileName: 'mock.pdf' };
        }
        try {
          const headers: Record<string, string> = {};
          const token = localStorage.getItem('authToken');
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const response = await fetch(`${API_URL}/tickets/${ticketId}/attachments`, {
            method: 'POST',
            headers,
            body: formData
          });
          if (!response.ok) throw new Error('Failed to upload attachment');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      deleteAttachment: async (ticketId: string, attachmentId: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return;
        }
        try {
          const response = await fetch(`${API_URL}/tickets/${ticketId}/attachments/${attachmentId}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to delete attachment');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      // Messages
      addMessage: async (ticketId: string, data: { sender: string; text: string; isInternal?: boolean }): Promise<TicketMessage> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { id: `msg-${Date.now()}`, sender: data.sender, text: data.text, date: new Date() };
        }
        try {
          const payload = {
            sender: data.sender,
            text: data.text,
            is_internal: data.isInternal || false
          };
          const response = await fetch(`${API_URL}/tickets/${ticketId}/messages`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody?.error || errBody?.details?.[0]?.message || `Failed to add message (${response.status})`);
          }
          const raw = await response.json();
          return {
            id: raw.id,
            sender: raw.sender,
            text: raw.text,
            date: new Date(raw.date || raw.created_at),
            isInternal: raw.isInternal || raw.is_internal
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      // Escalation
      escalate: async (ticketId: string, data: { reason: string; escalatedTo?: string }): Promise<any> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return { success: true };
        }
        try {
          const payload = {
            reason: data.reason,
            escalate_to: data.escalatedTo || null
          };
          const response = await fetch(`${API_URL}/tickets/${ticketId}/escalate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
          });
          if (!response.ok) throw new Error('Failed to escalate ticket');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      // Client-facing methods
      myTickets: async (): Promise<Ticket[]> => {
        if (USE_MOCK) return db.get(DB_KEYS.TICKETS, [] as Ticket[]).slice(0, 3);
        try {
          const response = await fetch(`${API_URL}/tickets/my`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch my tickets');
          const rawData = await response.json();
          return rawData.map((t: any) => ({
            id: t.id,
            subject: t.subject,
            description: t.description,
            status: t.status,
            priority: t.priority,
            category: t.category,
            subCategory: t.sub_category,
            source: t.source,
            messages: t.messages ? t.messages.map((m: any) => ({
              id: m.id,
              sender: m.sender,
              text: m.text,
              date: new Date(m.date)
            })) : [],
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at),
          }));
        } catch (e) {
          logger.warn('API Error (myTickets):', e);
          return [];
        }
      },
      clientReply: async (ticketId: string, text: string): Promise<TicketMessage> => {
        if (USE_MOCK) {
          return { id: `msg-${Date.now()}`, sender: 'CLIENT', text, date: new Date() };
        }
        const response = await fetch(`${API_URL}/tickets/${ticketId}/messages/client`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ text })
        });
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody?.error || `Erreur envoi message (${response.status})`);
        }
        const raw = await response.json();
        return { id: raw.id, sender: raw.sender, text: raw.text, date: new Date(raw.date) };
      }
    },

    // --- FAQ / KNOWLEDGE BASE ---
    faq: {
      categories: {
        list: async () => {
          const response = await fetch(`${API_URL}/faq/categories`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch FAQ categories');
          return response.json();
        },
        get: async (id: string) => {
          const response = await fetch(`${API_URL}/faq/categories/${id}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch FAQ category');
          return response.json();
        },
        create: async (data: any) => {
          const response = await fetch(`${API_URL}/faq/categories`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error('Failed to create FAQ category');
          return response.json();
        },
        update: async (id: string, data: any) => {
          const response = await fetch(`${API_URL}/faq/categories/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error('Failed to update FAQ category');
          return response.json();
        },
        delete: async (id: string) => {
          const response = await fetch(`${API_URL}/faq/categories/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to delete FAQ category');
          return response.json();
        }
      },
      articles: {
        list: async (params?: { category_id?: string; status?: string; search?: string }) => {
          const queryParams = new URLSearchParams(params as any).toString();
          const url = queryParams ? `${API_URL}/faq/articles?${queryParams}` : `${API_URL}/faq/articles`;
          const response = await fetch(url, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch FAQ articles');
          return response.json();
        },
        search: async (query: string) => {
          const response = await fetch(`${API_URL}/faq/articles/search?q=${encodeURIComponent(query)}`, {
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to search FAQ articles');
          return response.json();
        },
        get: async (id: string) => {
          const response = await fetch(`${API_URL}/faq/articles/${id}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch FAQ article');
          return response.json();
        },
        create: async (data: any) => {
          const response = await fetch(`${API_URL}/faq/articles`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error('Failed to create FAQ article');
          return response.json();
        },
        update: async (id: string, data: any) => {
          const response = await fetch(`${API_URL}/faq/articles/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error('Failed to update FAQ article');
          return response.json();
        },
        delete: async (id: string) => {
          const response = await fetch(`${API_URL}/faq/articles/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to delete FAQ article');
          return response.json();
        },
        publish: async (id: string) => {
          const response = await fetch(`${API_URL}/faq/articles/${id}/publish`, {
            method: 'POST',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to publish FAQ article');
          return response.json();
        },
        archive: async (id: string) => {
          const response = await fetch(`${API_URL}/faq/articles/${id}/archive`, {
            method: 'POST',
            headers: getHeaders()
          });
          if (!response.ok) throw new Error('Failed to archive FAQ article');
          return response.json();
        },
        view: async (id: string) => {
          const response = await fetch(`${API_URL}/faq/articles/${id}/view`, {
            method: 'POST',
            headers: getHeaders()
          });
          return response.json();
        },
        feedback: async (id: string, data: { is_helpful: boolean; feedback_text?: string }) => {
          const response = await fetch(`${API_URL}/faq/articles/${id}/feedback`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error('Failed to submit feedback');
          return response.json();
        }
      }
    },

    // --- AI Assistant & Support Chat ---
    ai: {
      ask: async (query: string) => {
        const response = await fetch(`${API_URL}/ai/ask`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ query })
        });
        if (!response.ok) throw new Error('AI request failed');
        return response.json();
      },
      analyzeReport: async (reportType: string, columns: string[], data: string[][]) => {
        const response = await fetch(`${API_URL}/ai/analyze-report`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ reportType, columns, data })
        });
        if (!response.ok) throw new Error('AI analysis failed');
        return response.json();
      },
      createConversation: async () => {
        const response = await fetch(`${API_URL}/ai/support-conversation`, {
          method: 'POST',
          headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to create conversation');
        return response.json();
      },
      sendMessage: async (conversationId: string, message: string) => {
        const response = await fetch(`${API_URL}/ai/support-conversation/${conversationId}/messages`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ message })
        });
        if (!response.ok) throw new Error('Failed to send message');
        return response.json();
      },
      getConversations: async (status: string = 'open') => {
        const response = await fetch(`${API_URL}/ai/support-conversations?status=${status}`, {
          headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to get conversations');
        return response.json();
      },
      getMessages: async (conversationId: string) => {
        const response = await fetch(`${API_URL}/ai/support-conversation/${conversationId}/messages`, {
          headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to get messages');
        return response.json();
      },
      // Internal Chat (Agent ↔ Agent)
      listAgents: async () => {
        const response = await fetch(`${API_URL}/ai/agents`, {
          headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to list agents');
        return response.json();
      },
      createInternalConversation: async (targetUserId: string) => {
        const response = await fetch(`${API_URL}/ai/internal-conversation`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ targetUserId })
        });
        if (!response.ok) throw new Error('Failed to create internal conversation');
        return response.json();
      },
      getInternalConversations: async (status: string = 'assigned') => {
        const response = await fetch(`${API_URL}/ai/internal-conversations?status=${status}`, {
          headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to get internal conversations');
        return response.json();
      },
      sendInternalMessage: async (conversationId: string, message: string) => {
        const response = await fetch(`${API_URL}/ai/internal-conversation/${conversationId}/messages`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ message })
        });
        if (!response.ok) throw new Error('Failed to send internal message');
        return response.json();
      },
      getInternalMessages: async (conversationId: string) => {
        const response = await fetch(`${API_URL}/ai/internal-conversation/${conversationId}/messages`, {
          headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to get internal messages');
        return response.json();
      }
    }
  };
}
