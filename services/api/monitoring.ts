// services/api/monitoring.ts — Monitoring domain: geofences, alert configs, alerts
import { API_URL, getHeaders } from './client';

export function createMonitoringApi() {
  return {
    // Geofences
    getGeofences: async () => {
      const response = await fetch(`${API_URL}/monitoring/geofences`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch geofences: ${response.status}`);
      return response.json();
    },
    getGeofence: async (id: string) => {
      const response = await fetch(`${API_URL}/monitoring/geofences/${id}`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch geofence: ${response.status}`);
      return response.json();
    },
    createGeofence: async (geofence: any) => {
      const response = await fetch(`${API_URL}/monitoring/geofences`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(geofence)
      });
      if (!response.ok) throw new Error(`Failed to create geofence: ${response.status}`);
      return response.json();
    },
    updateGeofence: async (id: string, geofence: any) => {
      const response = await fetch(`${API_URL}/monitoring/geofences/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(geofence)
      });
      if (!response.ok) throw new Error(`Failed to update geofence: ${response.status}`);
      return response.json();
    },
    deleteGeofence: async (id: string) => {
      const response = await fetch(`${API_URL}/monitoring/geofences/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error(`Failed to delete geofence: ${response.status}`);
      return response.json();
    },

    // Alert Configs
    getAlertConfigs: async () => {
      const response = await fetch(`${API_URL}/monitoring/alert-configs`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch alert configs: ${response.status}`);
      return response.json();
    },
    createAlertConfig: async (config: any) => {
      const response = await fetch(`${API_URL}/monitoring/alert-configs`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error(`Failed to create alert config: ${response.status}`);
      return response.json();
    },
    updateAlertConfig: async (id: string, config: any) => {
      const response = await fetch(`${API_URL}/monitoring/alert-configs/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error(`Failed to update alert config: ${response.status}`);
      return response.json();
    },
    deleteAlertConfig: async (id: string) => {
      const response = await fetch(`${API_URL}/monitoring/alert-configs/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error(`Failed to delete alert config: ${response.status}`);
      return response.json();
    },
    toggleAlertConfig: async (id: string, isActive: boolean) => {
      const response = await fetch(`${API_URL}/monitoring/alert-configs/${id}/toggle`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ is_active: isActive })
      });
      if (!response.ok) throw new Error(`Failed to toggle alert config: ${response.status}`);
      return response.json();
    },

    // Alerts
    getAlerts: async () => {
      const response = await fetch(`${API_URL}/monitoring/alerts`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch alerts: ${response.status}`);
      return response.json();
    },
    getAlertStats: async () => {
      const response = await fetch(`${API_URL}/monitoring/alerts/stats`, { headers: getHeaders() });
      if (!response.ok) throw new Error(`Failed to fetch alert stats: ${response.status}`);
      return response.json();
    },
    markAlertAsRead: async (id: string) => {
      const response = await fetch(`${API_URL}/monitoring/alerts/${id}/read`, {
        method: 'PUT',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error(`Failed to mark alert as read: ${response.status}`);
      return response.json();
    },
    markAllAlertsAsRead: async () => {
      const response = await fetch(`${API_URL}/monitoring/alerts/read-all`, {
        method: 'PUT',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error(`Failed to mark all alerts as read: ${response.status}`);
      return response.json();
    },
    deleteAlert: async (id: string) => {
      const response = await fetch(`${API_URL}/monitoring/alerts/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error(`Failed to delete alert: ${response.status}`);
      return response.json();
    }
  };
}
