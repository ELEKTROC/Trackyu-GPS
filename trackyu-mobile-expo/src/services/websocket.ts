/**
 * TrackYu Mobile - WebSocket Service
 *
 * Singleton Socket.IO connecté à wss://trackyugps.com
 * Gère : authentification JWT, reconnexion avec backoff, événements véhicules/alertes.
 */
import { io, type Socket } from 'socket.io-client';
import { WS_URL } from '../api/config';
import secureStorage from '../utils/secureStorage';
import type { Vehicle } from '../api/vehicles';
import type { Alert as TrackAlert } from '../api/alerts';
import type { User } from '../api/auth';

type VehicleUpdateHandler = (vehicle: Vehicle) => void;
type AlertNewHandler = (alert: TrackAlert) => void;
type ConnectionHandler = (connected: boolean) => void;

export interface CommandAckPayload {
  alertId: number;
  commandId: number;
  vehicleId: string;
  commandType: 'CUT_ENGINE' | 'RESTORE_ENGINE' | string;
  status: 'EXECUTED';
  ackLabel: string; // 'Succès' | 'Débloqué'
  responseText: string;
  timestamp: string;
}
type CommandAckHandler = (payload: CommandAckPayload) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private vehicleUpdateHandlers: Set<VehicleUpdateHandler> = new Set();
  private alertNewHandlers: Set<AlertNewHandler> = new Set();
  private commandAckHandlers: Set<CommandAckHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await secureStorage.getToken();
    if (!token) return; // Ne pas se connecter sans token

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000, // Backoff exponentiel jusqu'à 30s
      timeout: 10000,
    });

    this.socket.on('connect', async () => {
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers(true);
      // Rejoindre la room appropriée selon le rôle
      try {
        const user = await secureStorage.getUser<User>();
        const role = user?.role?.toUpperCase();
        if (role === 'SUPERADMIN') {
          this.socket?.emit('join:superadmin');
        } else if (user?.tenantId) {
          this.socket?.emit('join:tenant', user.tenantId);
        }
      } catch {
        // Non bloquant — les updates WS seront manquants mais le REST fonctionne
      }
    });

    this.socket.on('disconnect', () => {
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('connect_error', () => {
      this.reconnectAttempts++;
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('vehicle:update', (vehicle: Vehicle) => {
      this.vehicleUpdateHandlers.forEach((h) => h(vehicle));
    });

    this.socket.on('alert:new', (alert: TrackAlert) => {
      this.alertNewHandlers.forEach((h) => h(alert));
    });

    this.socket.on('alert:command_ack', (payload: CommandAckPayload) => {
      this.commandAckHandlers.forEach((h) => h(payload));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.notifyConnectionHandlers(false);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────

  onVehicleUpdate(handler: VehicleUpdateHandler): () => void {
    this.vehicleUpdateHandlers.add(handler);
    return () => this.vehicleUpdateHandlers.delete(handler);
  }

  onAlertNew(handler: AlertNewHandler): () => void {
    this.alertNewHandlers.add(handler);
    return () => this.alertNewHandlers.delete(handler);
  }

  onAlertAck(handler: CommandAckHandler): () => void {
    this.commandAckHandlers.add(handler);
    return () => this.commandAckHandlers.delete(handler);
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    // Émet immédiatement l'état actuel
    handler(this.isConnected);
    return () => this.connectionHandlers.delete(handler);
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((h) => h(connected));
  }
}

// Singleton exporté
export const wsService = new WebSocketService();
export default wsService;
