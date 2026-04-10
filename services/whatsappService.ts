/**
 * Service WhatsApp Business API
 * Pour envoyer des messages via WhatsApp Business Cloud API
 * Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

export interface WhatsAppConfig {
  phoneNumberId: string;      // ID du numéro WhatsApp Business
  accessToken: string;        // Token d'accès permanent
  businessAccountId?: string; // ID du compte Business (optionnel)
  webhookVerifyToken?: string; // Token de vérification webhook
}

export interface WhatsAppMessage {
  to: string;                 // Numéro destinataire (format international sans +)
  type: 'text' | 'template' | 'image' | 'document' | 'location';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  image?: { link: string; caption?: string };
  document?: { link: string; filename?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
}

export interface WhatsAppSendResult {
  messaging_product: string;
  contacts?: Array<{ input: string; wa_id: string }>;
  messages?: Array<{ id: string }>;
  error?: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: string;
}

// Templates prédéfinis pour GPS tracking
export const GPS_TEMPLATES = {
  alert: {
    name: 'gps_alert',
    description: 'Alerte véhicule (excès vitesse, géofence, etc.)',
    variables: ['vehicle_name', 'alert_type', 'message', 'time']
  },
  daily_report: {
    name: 'daily_report',
    description: 'Rapport journalier de flotte',
    variables: ['date', 'total_km', 'active_vehicles', 'alerts_count']
  },
  payment_reminder: {
    name: 'payment_reminder',
    description: 'Rappel de paiement abonnement',
    variables: ['client_name', 'amount', 'due_date', 'payment_link']
  },
  welcome: {
    name: 'welcome_client',
    description: 'Bienvenue nouveau client',
    variables: ['client_name', 'login_url']
  }
};

class WhatsAppService {
  private baseUrl = 'https://graph.facebook.com/v18.0';
  private config: WhatsAppConfig | null = null;

  /**
   * Configure le service
   */
  configure(config: WhatsAppConfig) {
    this.config = config;
    this.saveConfig();
  }

  /**
   * Récupère la configuration depuis localStorage
   */
  getConfig(): WhatsAppConfig | null {
    if (this.config) return this.config;
    
    const stored = localStorage.getItem('whatsapp_config');
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
      localStorage.setItem('whatsapp_config', JSON.stringify(this.config));
    }
  }

  /**
   * Vérifie si le service est configuré
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!config?.phoneNumberId && !!config?.accessToken;
  }

  /**
   * Headers d'authentification
   */
  private getHeaders(): HeadersInit {
    const config = this.getConfig();
    if (!config?.accessToken) throw new Error('WhatsApp non configuré');
    
    return {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * URL de l'API messages
   */
  private getMessagesUrl(): string {
    const config = this.getConfig();
    if (!config?.phoneNumberId) throw new Error('WhatsApp non configuré');
    return `${this.baseUrl}/${config.phoneNumberId}/messages`;
  }

  /**
   * Test la connexion
   */
  async testConnection(): Promise<{ success: boolean; error?: string; phoneNumber?: string }> {
    try {
      const config = this.getConfig();
      if (!config?.phoneNumberId || !config?.accessToken) {
        return { success: false, error: 'Configuration incomplète' };
      }

      // Récupérer les infos du numéro
      const response = await fetch(`${this.baseUrl}/${config.phoneNumberId}`, {
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.error) {
        return { success: false, error: data.error.message };
      }

      return { 
        success: true, 
        phoneNumber: data.display_phone_number || data.verified_name 
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur de connexion' };
    }
  }

  /**
   * Formate un numéro de téléphone (enlève + et espaces)
   */
  private formatPhoneNumber(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  /**
   * Envoie un message texte simple
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppSendResult> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'text',
      text: { 
        preview_url: true,
        body: text 
      }
    };

    const response = await fetch(this.getMessagesUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * Envoie un message template (pour les messages initiés par l'entreprise)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'fr',
    components?: any[]
  ): Promise<WhatsAppSendResult> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components
      }
    };

    const response = await fetch(this.getMessagesUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * Envoie une alerte véhicule
   */
  async sendVehicleAlert(
    to: string,
    alert: {
      type: 'SPEEDING' | 'GEOFENCE' | 'MAINTENANCE' | 'SOS' | 'IDLE' | 'OTHER';
      vehicleName: string;
      message: string;
      location?: { lat: number; lng: number };
      timestamp?: Date;
    }
  ): Promise<WhatsAppSendResult> {
    const icons: Record<string, string> = {
      SPEEDING: '🚨',
      GEOFENCE: '📍',
      MAINTENANCE: '🔧',
      SOS: '🆘',
      IDLE: '⏸️',
      OTHER: 'ℹ️'
    };

    const alertLabels: Record<string, string> = {
      SPEEDING: 'Excès de vitesse',
      GEOFENCE: 'Zone géographique',
      MAINTENANCE: 'Maintenance',
      SOS: 'Urgence SOS',
      IDLE: 'Ralenti prolongé',
      OTHER: 'Notification'
    };

    const time = alert.timestamp 
      ? alert.timestamp.toLocaleString('fr-FR') 
      : new Date().toLocaleString('fr-FR');

    const text = `
${icons[alert.type]} *ALERTE ${alertLabels[alert.type].toUpperCase()}*

🚗 *Véhicule:* ${alert.vehicleName}
📝 *Message:* ${alert.message}
🕐 *Heure:* ${time}
${alert.location ? `📍 *Position:* https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}` : ''}

_TrackYu GPS_
`.trim();

    return this.sendTextMessage(to, text);
  }

  /**
   * Envoie un rappel de paiement
   */
  async sendPaymentReminder(
    to: string,
    payment: {
      clientName: string;
      amount: number;
      currency: string;
      dueDate: Date;
      vehicleName?: string;
      paymentLink?: string;
    }
  ): Promise<WhatsAppSendResult> {
    const dueDateStr = payment.dueDate.toLocaleDateString('fr-FR');

    const text = `
💰 *Rappel de Paiement*

Bonjour *${payment.clientName}*,

Votre abonnement GPS${payment.vehicleName ? ` pour *${payment.vehicleName}*` : ''} arrive à échéance.

💵 *Montant:* ${payment.amount.toLocaleString()} ${payment.currency}
📅 *Échéance:* ${dueDateStr}
${payment.paymentLink ? `\n🔗 *Payer maintenant:* ${payment.paymentLink}` : ''}

Pour éviter toute interruption de service, merci de procéder au règlement.

_TrackYu GPS_
`.trim();

    return this.sendTextMessage(to, text);
  }

  /**
   * Envoie une confirmation de paiement
   */
  async sendPaymentConfirmation(
    to: string,
    payment: {
      clientName: string;
      amount: number;
      currency: string;
      reference: string;
      validUntil: Date;
      vehicleName?: string;
    }
  ): Promise<WhatsAppSendResult> {
    const validUntilStr = payment.validUntil.toLocaleDateString('fr-FR');

    const text = `
✅ *Paiement Reçu*

Bonjour *${payment.clientName}*,

Nous confirmons la réception de votre paiement.

💵 *Montant:* ${payment.amount.toLocaleString()} ${payment.currency}
🔖 *Référence:* ${payment.reference}
${payment.vehicleName ? `🚗 *Véhicule:* ${payment.vehicleName}` : ''}
📅 *Valide jusqu'au:* ${validUntilStr}

Merci de votre confiance! 🙏

_TrackYu GPS_
`.trim();

    return this.sendTextMessage(to, text);
  }

  /**
   * Envoie une position de véhicule
   */
  async sendVehicleLocation(
    to: string,
    vehicle: {
      name: string;
      lat: number;
      lng: number;
      address?: string;
      speed?: number;
      driver?: string;
    }
  ): Promise<WhatsAppSendResult> {
    const config = this.getConfig();
    if (!config) throw new Error('WhatsApp non configuré');

    // Envoyer d'abord un message texte puis la localisation
    const text = `
📍 *Position de ${vehicle.name}*

${vehicle.driver ? `👤 *Conducteur:* ${vehicle.driver}` : ''}
${vehicle.speed !== undefined ? `⚡ *Vitesse:* ${vehicle.speed} km/h` : ''}
${vehicle.address ? `📫 *Adresse:* ${vehicle.address}` : ''}

_Localisation envoyée ci-dessous_
`.trim();

    await this.sendTextMessage(to, text);

    // Envoyer la localisation
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'location',
      location: {
        latitude: vehicle.lat,
        longitude: vehicle.lng,
        name: vehicle.name,
        address: vehicle.address || `${vehicle.lat}, ${vehicle.lng}`
      }
    };

    const response = await fetch(this.getMessagesUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * Envoie un document (PDF rapport, etc.)
   */
  async sendDocument(
    to: string,
    document: {
      url: string;
      filename: string;
      caption?: string;
    }
  ): Promise<WhatsAppSendResult> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'document',
      document: {
        link: document.url,
        filename: document.filename,
        caption: document.caption
      }
    };

    const response = await fetch(this.getMessagesUrl(), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * Supprime la configuration
   */
  disconnect() {
    this.config = null;
    localStorage.removeItem('whatsapp_config');
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
