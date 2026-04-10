import { api } from '../../../services/apiLazy';
import { GPS_SERVER_IP, GPS_SERVER_PORT, DEFAULT_APN } from '../constants';

export interface DeviceCommandResult {
  success: boolean;
  message: string;
  timestamp: string;
  data?: any;
}

// Named exports for direct imports
export const pingPosition = async (imei: string): Promise<DeviceCommandResult> => {
  try {
    const response = await api.post(`/devices/${imei}/command`, { type: 'PING' });
    return {
      success: true,
      message: 'Commande Ping envoyée',
      timestamp: new Date().toISOString(),
      data: response.data,
    };
  } catch {
    return {
      success: false,
      message: 'Erreur lors du Ping (Device hors ligne ?)',
      timestamp: new Date().toISOString(),
    };
  }
};

export const cutEngine = async (imei: string): Promise<DeviceCommandResult> => {
  try {
    await api.post(`/devices/${imei}/command`, { type: 'CUT_ENGINE' });
    return {
      success: true,
      message: 'Commande Coupure Moteur envoyée',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      message: 'Erreur lors de la coupure moteur',
      timestamp: new Date().toISOString(),
    };
  }
};

export const configureAPN = async (imei: string): Promise<DeviceCommandResult> => {
  try {
    await api.post(`/devices/${imei}/command`, {
      type: 'CONFIGURE_APN',
      params: { apn: DEFAULT_APN },
    });
    return {
      success: true,
      message: 'Configuration APN envoyée',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      message: 'Erreur config APN',
      timestamp: new Date().toISOString(),
    };
  }
};

export const configureIP = async (imei: string): Promise<DeviceCommandResult> => {
  try {
    await api.post(`/devices/${imei}/command`, {
      type: 'CONFIGURE_SERVER',
      params: { ip: GPS_SERVER_IP, port: GPS_SERVER_PORT },
    });
    return {
      success: true,
      message: 'Configuration Serveur envoyée',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      success: false,
      message: 'Erreur config Serveur',
      timestamp: new Date().toISOString(),
    };
  }
};

// Legacy object export for backward compatibility
export const deviceService = {
  pingPosition,
  cutEngine,
  configureAPN,
  configureIP,
};
