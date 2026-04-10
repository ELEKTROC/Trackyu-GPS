/**
 * Service Resend Email API
 * Pour envoyer des emails transactionnels
 * Documentation: https://resend.com/docs/api-reference
 */

export interface ResendConfig {
  apiKey: string;
  defaultFrom: string; // ex: "TrackYu GPS <noreply@trackyu.com>"
}

export interface ResendEmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    content_type?: string;
  }>;
  tags?: Array<{
    name: string;
    value: string;
  }>;
}

export interface ResendSendResult {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

export interface ResendDomain {
  id: string;
  name: string;
  status: 'pending' | 'verified' | 'failed';
  created_at: string;
  region: string;
}

export interface ResendEmail {
  id: string;
  object: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  html: string;
  text: string | null;
  bcc: string[] | null;
  cc: string[] | null;
  reply_to: string[] | null;
  last_event: string;
}

class ResendService {
  private baseUrl = 'https://api.resend.com';
  private config: ResendConfig | null = null;

  /**
   * Configure le service avec la clé API
   */
  configure(config: ResendConfig) {
    this.config = config;
    this.saveConfig();
  }

  /**
   * Récupère la configuration depuis localStorage
   */
  getConfig(): ResendConfig | null {
    if (this.config) return this.config;
    
    const stored = localStorage.getItem('resend_config');
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
      localStorage.setItem('resend_config', JSON.stringify(this.config));
    }
  }

  /**
   * Vérifie si le service est configuré
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!config?.apiKey && !!config?.defaultFrom;
  }

  /**
   * Headers d'authentification
   */
  private getHeaders(): HeadersInit {
    const config = this.getConfig();
    if (!config?.apiKey) throw new Error('Resend non configuré');
    
    return {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Test la connexion avec l'API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // On utilise l'endpoint domains comme test
      const response = await fetch(`${this.baseUrl}/domains`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        const data = await response.json();
        return { success: false, error: data.error?.message || 'Clé API invalide' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Erreur de connexion' };
    }
  }

  /**
   * Envoie un email
   */
  async sendEmail(payload: Omit<ResendEmailPayload, 'from'> & { from?: string }): Promise<ResendSendResult> {
    const config = this.getConfig();
    if (!config) throw new Error('Resend non configuré');

    const emailPayload: ResendEmailPayload = {
      from: payload.from || config.defaultFrom,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      cc: payload.cc,
      bcc: payload.bcc,
      reply_to: payload.reply_to,
      headers: payload.headers,
      attachments: payload.attachments,
      tags: payload.tags
    };

    const response = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(emailPayload)
    });

    return response.json();
  }

  /**
   * Envoie une notification d'alerte par email
   */
  async sendAlertEmail(
    to: string | string[],
    alert: {
      type: 'SPEEDING' | 'GEOFENCE' | 'MAINTENANCE' | 'SOS' | 'IDLE' | 'OTHER';
      vehicleName: string;
      message: string;
      timestamp?: Date;
      mapUrl?: string;
    }
  ): Promise<ResendSendResult> {
    const alertColors: Record<string, string> = {
      SPEEDING: '#ef4444',
      GEOFENCE: '#f59e0b',
      MAINTENANCE: '#3b82f6',
      SOS: '#dc2626',
      IDLE: '#6b7280',
      OTHER: '#8b5cf6'
    };

    const alertLabels: Record<string, string> = {
      SPEEDING: 'Excès de vitesse',
      GEOFENCE: 'Zone géographique',
      MAINTENANCE: 'Maintenance',
      SOS: 'Urgence SOS',
      IDLE: 'Ralenti prolongé',
      OTHER: 'Autre'
    };

    const time = alert.timestamp 
      ? alert.timestamp.toLocaleString('fr-FR') 
      : new Date().toLocaleString('fr-FR');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${alertColors[alert.type]}; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
                🚨 Alerte ${alertLabels[alert.type]}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Véhicule:</strong>
                    <span style="color: #6b7280; float: right;">${alert.vehicleName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Message:</strong>
                    <p style="color: #6b7280; margin: 8px 0 0 0;">${alert.message}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Date/Heure:</strong>
                    <span style="color: #6b7280; float: right;">${time}</span>
                  </td>
                </tr>
              </table>
              
              ${alert.mapUrl ? `
              <div style="margin-top: 24px; text-align: center;">
                <a href="${alert.mapUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  📍 Voir sur la carte
                </a>
              </div>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                TrackYu GPS Tracking System<br>
                <a href="#" style="color: #3b82f6; text-decoration: none;">Gérer les alertes</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to,
      subject: `🚨 Alerte ${alertLabels[alert.type]} - ${alert.vehicleName}`,
      html,
      tags: [
        { name: 'type', value: 'alert' },
        { name: 'alert_type', value: alert.type }
      ]
    });
  }

  /**
   * Envoie un rapport journalier par email
   */
  async sendDailyReportEmail(
    to: string | string[],
    report: {
      date: Date;
      totalVehicles: number;
      activeVehicles: number;
      totalDistance: number;
      fuelConsumed: number;
      alertsCount: number;
      topVehicles?: Array<{ name: string; distance: number }>;
    }
  ): Promise<ResendSendResult> {
    const dateStr = report.date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const topVehiclesHtml = report.topVehicles?.length 
      ? report.topVehicles.map(v => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${v.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${v.distance.toLocaleString()} km</td>
        </tr>
      `).join('')
      : '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #9ca3af;">Aucune donnée</td></tr>';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
                📊 Rapport Journalier
              </h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0 0;">${dateStr}</p>
            </td>
          </tr>
          
          <!-- Stats Grid -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 16px; text-align: center; background-color: #f0f9ff; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #2563eb;">${report.totalVehicles}</div>
                    <div style="color: #6b7280; font-size: 14px;">Véhicules Total</div>
                  </td>
                  <td width="16"></td>
                  <td width="50%" style="padding: 16px; text-align: center; background-color: #f0fdf4; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #16a34a;">${report.activeVehicles}</div>
                    <div style="color: #6b7280; font-size: 14px;">Véhicules Actifs</div>
                  </td>
                </tr>
                <tr><td colspan="3" height="16"></td></tr>
                <tr>
                  <td width="50%" style="padding: 16px; text-align: center; background-color: #fefce8; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #ca8a04;">${report.totalDistance.toLocaleString()}</div>
                    <div style="color: #6b7280; font-size: 14px;">Km Parcourus</div>
                  </td>
                  <td width="16"></td>
                  <td width="50%" style="padding: 16px; text-align: center; background-color: #fef2f2; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #dc2626;">${report.alertsCount}</div>
                    <div style="color: #6b7280; font-size: 14px;">Alertes</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Vehicles -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h3 style="color: #374151; margin: 0 0 16px 0;">🏆 Top Véhicules</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #e5e7eb;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Véhicule</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Distance</th>
                </tr>
                ${topVehiclesHtml}
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                TrackYu GPS Tracking System<br>
                <a href="#" style="color: #3b82f6; text-decoration: none;">Voir le tableau de bord</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to,
      subject: `📊 Rapport Flotte - ${report.date.toLocaleDateString('fr-FR')}`,
      html,
      tags: [{ name: 'type', value: 'daily_report' }]
    });
  }

  /**
   * Envoie un email de bienvenue
   */
  async sendWelcomeEmail(
    to: string,
    user: {
      name: string;
      email: string;
      tempPassword?: string;
      loginUrl: string;
    }
  ): Promise<ResendSendResult> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #2563eb; padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">
                🎉 Bienvenue sur TrackYu GPS!
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Bonjour <strong>${user.name}</strong>,
              </p>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                Votre compte TrackYu GPS a été créé avec succès. Vous pouvez maintenant accéder à votre tableau de bord pour suivre votre flotte en temps réel.
              </p>
              
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; color: #374151;"><strong>Email:</strong> ${user.email}</p>
                ${user.tempPassword ? `<p style="margin: 0; color: #374151;"><strong>Mot de passe temporaire:</strong> ${user.tempPassword}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${user.loginUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  🚀 Accéder à TrackYu
                </a>
              </div>
              
              ${user.tempPassword ? `
              <p style="color: #ef4444; font-size: 14px; text-align: center;">
                ⚠️ Pensez à changer votre mot de passe lors de votre première connexion.
              </p>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                TrackYu GPS Tracking System<br>
                <a href="#" style="color: #3b82f6; text-decoration: none;">Support</a> • 
                <a href="#" style="color: #3b82f6; text-decoration: none;">Documentation</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to,
      subject: `🎉 Bienvenue sur TrackYu GPS, ${user.name}!`,
      html,
      tags: [{ name: 'type', value: 'welcome' }]
    });
  }

  /**
   * Envoie un email de récupération de mot de passe
   */
  async sendPasswordResetEmail(
    to: string,
    resetUrl: string
  ): Promise<ResendSendResult> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #f59e0b; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
                🔑 Réinitialisation du mot de passe
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Vous avez demandé la réinitialisation de votre mot de passe TrackYu GPS.
              </p>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
                Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien expirera dans 1 heure.
              </p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  🔒 Réinitialiser mon mot de passe
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 14px; text-align: center;">
                Si vous n'avez pas fait cette demande, ignorez cet email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; margin: 0; font-size: 14px;">
                TrackYu GPS Tracking System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    return this.sendEmail({
      to,
      subject: `🔑 Réinitialisation de votre mot de passe TrackYu`,
      html,
      tags: [{ name: 'type', value: 'password_reset' }]
    });
  }

  /**
   * Liste les domaines vérifiés
   */
  async listDomains(): Promise<ResendDomain[]> {
    const response = await fetch(`${this.baseUrl}/domains`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Récupère un email envoyé
   */
  async getEmail(emailId: string): Promise<ResendEmail | null> {
    const response = await fetch(`${this.baseUrl}/emails/${emailId}`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (response.ok) {
      return response.json();
    }
    return null;
  }

  /**
   * Supprime la configuration
   */
  disconnect() {
    this.config = null;
    localStorage.removeItem('resend_config');
  }
}

export const resendService = new ResendService();
export default resendService;
