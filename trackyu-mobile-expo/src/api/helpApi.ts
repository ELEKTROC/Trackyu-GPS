/**
 * TrackYu Mobile — Help API
 * - GET /tenants/current → infos contact du tenant (phone, email)
 * - POST /ai/ask → question à l'assistant Gemini
 */
import apiClient from './client';
import { normalizeError } from '../utils/errorTypes';

export interface TenantContact {
  phone: string;
  email: string;
  whatsapp?: string;
  name: string;
}

export interface AIResponse {
  response: string;
  conversationId: string | null;
}

export const helpApi = {
  async getTenantContact(): Promise<TenantContact> {
    try {
      const { data } = await apiClient.get('/tenants/current');
      const settings = data.settings ?? {};
      return {
        name: data.name ?? 'TrackYu',
        phone: settings.phone || data.phone || data.contact_phone || '',
        email: settings.email || data.email || data.contact_email || 'support@trackyugps.com',
        whatsapp: settings.whatsapp || settings.phone || data.phone || '',
      };
    } catch {
      return { name: 'TrackYu', phone: '', email: 'support@trackyugps.com' };
    }
  },

  async askAI(query: string, conversationId?: string | null): Promise<AIResponse> {
    try {
      const { data } = await apiClient.post<AIResponse>('/ai/ask', {
        query,
        conversationId: conversationId ?? undefined,
      });
      return data;
    } catch (error) {
      throw normalizeError(error);
    }
  },
};
