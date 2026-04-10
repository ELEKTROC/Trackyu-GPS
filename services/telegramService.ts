/**
 * Service Telegram Bot API
 * Pour envoyer des notifications aux utilisateurs via Telegram
 * Documentation: https://core.telegram.org/bots/api
 */

export interface TelegramConfig {
  botToken: string;
  defaultChatId?: string;
}

export interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_notification?: boolean;
  reply_markup?: any;
}

export interface TelegramSendResult {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text: string;
  };
  description?: string;
  error_code?: number;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
    };
    date: number;
    text?: string;
  };
}

class TelegramService {
  private baseUrl = 'https://api.telegram.org/bot';
  private config: TelegramConfig | null = null;

  /**
   * Configure le service avec le token du bot
   */
  configure(config: TelegramConfig) {
    this.config = config;
    this.saveConfig();
  }

  /**
   * Récupère la configuration depuis localStorage
   */
  getConfig(): TelegramConfig | null {
    if (this.config) return this.config;
    
    const stored = localStorage.getItem('telegram_config');
    if (stored) {
      try {
        this.config = JSON.parse(stored);
        return this.config;
      } catch {
        return null;
      }
    }
    return null;
  }

  private saveConfig() {
    if (this.config) {
      localStorage.setItem('telegram_config', JSON.stringify(this.config));
    }
  }

  /**
   * Vérifie si le service est configuré
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!config?.botToken;
  }

  /**
   * Construit l'URL de l'API
   */
  private getApiUrl(method: string): string {
    const config = this.getConfig();
    if (!config?.botToken) throw new Error('Telegram non configuré');
    return `${this.baseUrl}${config.botToken}/${method}`;
  }

  /**
   * Test la connexion avec le bot
   */
  async testConnection(): Promise<{ success: boolean; botInfo?: TelegramBotInfo; error?: string }> {
    try {
      const response = await fetch(this.getApiUrl('getMe'));
      const data = await response.json();
      
      if (data.ok) {
        return { success: true, botInfo: data.result };
      } else {
        return { success: false, error: data.description || 'Erreur inconnue' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur de connexion' };
    }
  }

  /**
   * Envoie un message texte
   */
  async sendMessage(
    chatId: string | number,
    text: string,
    options?: Partial<TelegramMessage>
  ): Promise<TelegramSendResult> {
    const payload: TelegramMessage = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...options
    };

    const response = await fetch(this.getApiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * Envoie une notification d'alerte formatée
   */
  async sendAlert(
    chatId: string | number,
    alert: {
      type: 'SPEEDING' | 'GEOFENCE' | 'MAINTENANCE' | 'SOS' | 'IDLE' | 'OTHER';
      vehicleName: string;
      message: string;
      timestamp?: Date;
    }
  ): Promise<TelegramSendResult> {
    const icons: Record<string, string> = {
      SPEEDING: '🚨',
      GEOFENCE: '📍',
      MAINTENANCE: '🔧',
      SOS: '🆘',
      IDLE: '⏸️',
      OTHER: 'ℹ️'
    };

    const icon = icons[alert.type] || '📢';
    const time = alert.timestamp ? alert.timestamp.toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR');

    const text = `
${icon} <b>Alerte ${alert.type}</b>

🚗 <b>Véhicule:</b> ${alert.vehicleName}
📝 <b>Message:</b> ${alert.message}
🕐 <b>Heure:</b> ${time}

—
<i>TrackYu GPS Tracking</i>
`.trim();

    return this.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }

  /**
   * Envoie une notification de statut véhicule
   */
  async sendVehicleStatus(
    chatId: string | number,
    vehicle: {
      name: string;
      status: 'moving' | 'idle' | 'parked' | 'offline';
      speed?: number;
      address?: string;
      driver?: string;
    }
  ): Promise<TelegramSendResult> {
    const statusIcons: Record<string, string> = {
      moving: '🚗💨',
      idle: '🚗⏸️',
      parked: '🅿️',
      offline: '📴'
    };

    const statusText: Record<string, string> = {
      moving: 'En mouvement',
      idle: 'Au ralenti',
      parked: 'Stationné',
      offline: 'Hors ligne'
    };

    const text = `
${statusIcons[vehicle.status]} <b>Statut Véhicule</b>

🚗 <b>Véhicule:</b> ${vehicle.name}
📊 <b>État:</b> ${statusText[vehicle.status]}
${vehicle.speed ? `⚡ <b>Vitesse:</b> ${vehicle.speed} km/h` : ''}
${vehicle.address ? `📍 <b>Position:</b> ${vehicle.address}` : ''}
${vehicle.driver ? `👤 <b>Conducteur:</b> ${vehicle.driver}` : ''}
`.trim();

    return this.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }

  /**
   * Envoie un rapport journalier
   */
  async sendDailyReport(
    chatId: string | number,
    report: {
      date: Date;
      totalVehicles: number;
      activeVehicles: number;
      totalDistance: number;
      alertsCount: number;
      topAlerts?: string[];
    }
  ): Promise<TelegramSendResult> {
    const dateStr = report.date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const alertsList = report.topAlerts?.length 
      ? report.topAlerts.map((a, i) => `  ${i + 1}. ${a}`).join('\n')
      : '  Aucune';

    const text = `
📊 <b>Rapport Journalier</b>
📅 ${dateStr}

━━━━━━━━━━━━━━━━━━━━━━

🚗 <b>Flotte</b>
• Véhicules totaux: ${report.totalVehicles}
• Véhicules actifs: ${report.activeVehicles}
• Distance parcourue: ${report.totalDistance.toLocaleString()} km

⚠️ <b>Alertes (${report.alertsCount})</b>
${alertsList}

━━━━━━━━━━━━━━━━━━━━━━
<i>TrackYu GPS - Rapport automatique</i>
`.trim();

    return this.sendMessage(chatId, text, { parse_mode: 'HTML' });
  }

  /**
   * Récupère les mises à jour (messages reçus)
   * Utile pour récupérer les chat_id des utilisateurs
   */
  async getUpdates(offset?: number): Promise<TelegramUpdate[]> {
    const url = new URL(this.getApiUrl('getUpdates'));
    if (offset) url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', '100');

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.ok) {
      return data.result;
    }
    return [];
  }

  /**
   * Récupère les chats/utilisateurs qui ont interagi avec le bot
   */
  async getRecentChats(): Promise<Array<{ id: number; name: string; type: string }>> {
    const updates = await this.getUpdates();
    const chatsMap = new Map<number, { id: number; name: string; type: string }>();

    for (const update of updates) {
      if (update.message?.chat) {
        const chat = update.message.chat;
        const name = chat.title || 
          (update.message.from ? 
            `${update.message.from.first_name} ${update.message.from.last_name || ''}`.trim() : 
            `Chat ${chat.id}`);
        
        chatsMap.set(chat.id, {
          id: chat.id,
          name,
          type: chat.type
        });
      }
    }

    return Array.from(chatsMap.values());
  }

  /**
   * Envoie un message avec boutons inline
   */
  async sendMessageWithButtons(
    chatId: string | number,
    text: string,
    buttons: Array<{ text: string; url?: string; callback_data?: string }>
  ): Promise<TelegramSendResult> {
    const keyboard = {
      inline_keyboard: [buttons.map(btn => ({
        text: btn.text,
        ...(btn.url ? { url: btn.url } : {}),
        ...(btn.callback_data ? { callback_data: btn.callback_data } : {})
      }))]
    };

    return this.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }

  /**
   * Supprime la configuration
   */
  disconnect() {
    this.config = null;
    localStorage.removeItem('telegram_config');
  }
}

export const telegramService = new TelegramService();
export default telegramService;
