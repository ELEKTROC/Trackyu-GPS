// services/api/notifications.ts — Notifications domain: email, sms, telegram, whatsapp, batch
import { API_URL, getHeaders } from './client';

export function createNotificationsApi() {
  return {
    email: async (data: { to: string | string[], subject: string, html?: string, text?: string, from?: string, replyTo?: string }) => {
      const response = await fetch(`${API_URL}/send/email`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },
    sms: async (data: { to: string, message: string }) => {
      const response = await fetch(`${API_URL}/send/sms`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },
    telegram: async (data: { chatId: string | number, message: string, parseMode?: string }) => {
      const response = await fetch(`${API_URL}/send/telegram`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },
    whatsapp: async (data: { to: string, message?: string, templateName?: string, templateLanguage?: string }) => {
      const response = await fetch(`${API_URL}/send/whatsapp`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return response.json();
    },
    batch: async (notifications: any[]) => {
      const response = await fetch(`${API_URL}/send/batch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ notifications })
      });
      return response.json();
    },
    getStats: async (days?: number) => {
      const url = days ? `${API_URL}/send/stats?days=${days}` : `${API_URL}/send/stats`;
      const response = await fetch(url, { headers: getHeaders() });
      return response.json();
    },
    getProviders: async () => {
      const response = await fetch(`${API_URL}/send/providers`, { headers: getHeaders() });
      return response.json();
    },
    // Push Notification Preferences
    getPreferences: async () => {
      const response = await fetch(`${API_URL}/notifications/preferences`, { headers: getHeaders() });
      if (!response.ok) throw new Error('Failed to fetch notification preferences');
      return response.json();
    },
    updatePreferences: async (preferences: any) => {
      const response = await fetch(`${API_URL}/notifications/preferences`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(preferences)
      });
      if (!response.ok) throw new Error('Failed to update notification preferences');
      return response.json();
    }
  };
}
