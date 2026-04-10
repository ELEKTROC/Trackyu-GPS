# 🔌 Intégrations Externes

## Vue d'ensemble

| Service | Type | Région | Fichier |
|---------|------|--------|---------|
| Orange SMS | SMS | Côte d'Ivoire | `orangeSmsService.ts` |
| Wave | Paiement | Afrique de l'Ouest | `waveService.ts` |
| Telegram | Notification | Global | `telegramService.ts` |
| WhatsApp | Notification | Global | `whatsappService.ts` |
| Resend | Email | Global | `resendService.ts` |

## 🔐 Configuration

### Variables d'environnement (`/backend/.env`)

```bash
# SMS Orange CI
ORANGE_SMS_CLIENT_ID=your_client_id
ORANGE_SMS_CLIENT_SECRET=your_client_secret
ORANGE_SMS_SENDER_NAME=TrackYu
ORANGE_SMS_AUTH_URL=https://api.orange.com/oauth/v3/token
ORANGE_SMS_API_URL=https://api.orange.com/smsmessaging/v1/outbound

# Paiements Wave
WAVE_API_KEY=your_wave_api_key
WAVE_API_URL=https://api.wave.com/v1

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token

# WhatsApp Business API
WHATSAPP_API_TOKEN=your_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id

# Email (Resend)
RESEND_API_KEY=re_xxxxx

```

## 📱 SMS Orange CI

### Service (`services/orangeSmsService.ts`)

```typescript
import axios from 'axios';

class OrangeSmsService {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  
  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }
    
    const response = await axios.post(
      process.env.ORANGE_SMS_AUTH_URL,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${process.env.ORANGE_SMS_CLIENT_ID}:${process.env.ORANGE_SMS_CLIENT_SECRET}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
    
    return this.accessToken;
  }
  
  async sendSms(to: string, message: string): Promise<boolean> {
    const token = await this.getAccessToken();
    const senderName = process.env.ORANGE_SMS_SENDER_NAME;
    
    // Format: +225XXXXXXXXXX
    const formattedNumber = to.startsWith('+') ? to : `+225${to}`;
    
    await axios.post(
      `${process.env.ORANGE_SMS_API_URL}/tel:${senderName}/requests`,
      {
        outboundSMSMessageRequest: {
          address: `tel:${formattedNumber}`,
          senderAddress: `tel:${senderName}`,
          outboundSMSTextMessage: { message }
        }
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    return true;
  }
}

export const orangeSmsService = new OrangeSmsService();
```

### Utilisation

```typescript
// Envoyer un SMS
await orangeSmsService.sendSms('+2250701234567', 'Votre véhicule a quitté la zone autorisée');
```

## 💰 Wave (Paiements Mobile Money)

### Service (`services/waveService.ts`)

```typescript
class WaveService {
  async createPaymentLink(amount: number, description: string): Promise<PaymentLink> {
    const response = await axios.post(
      `${process.env.WAVE_API_URL}/checkout/sessions`,
      {
        amount: amount.toString(),
        currency: 'XOF',
        error_url: 'https://trackyugps.com/payment/error',
        success_url: 'https://trackyugps.com/payment/success'
      },
      {
        headers: { 'Authorization': `Bearer ${process.env.WAVE_API_KEY}` }
      }
    );
    
    return {
      id: response.data.id,
      url: response.data.wave_launch_url,
      amount,
      reference: response.data.client_reference
    };
  }
  
  async verifyPayment(sessionId: string): Promise<PaymentStatus> {
    const response = await axios.get(
      `${process.env.WAVE_API_URL}/checkout/sessions/${sessionId}`,
      {
        headers: { 'Authorization': `Bearer ${process.env.WAVE_API_KEY}` }
      }
    );
    
    return {
      status: response.data.payment_status, // 'succeeded' | 'pending' | 'failed'
      amount: response.data.amount,
      paidAt: response.data.when_completed
    };
  }
}

export const waveService = new WaveService();
```

## 🤖 Telegram Bot

### Service (`services/telegramService.ts`)

```typescript
import TelegramBot from 'node-telegram-bot-api';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

class TelegramService {
  async sendMessage(chatId: string, message: string): Promise<void> {
    await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
  }
  
  async sendAlert(chatId: string, alert: Alert): Promise<void> {
    const message = `
🚨 <b>ALERTE</b>

📍 Véhicule: ${alert.vehicleName}
⚠️ Type: ${alert.type}
📅 Date: ${alert.timestamp}
📌 Position: ${alert.latitude}, ${alert.longitude}

<a href="https://maps.google.com/?q=${alert.latitude},${alert.longitude}">Voir sur Google Maps</a>
    `;
    
    await this.sendMessage(chatId, message);
  }
  
  async sendDailyReport(chatId: string, report: DailyReport): Promise<void> {
    const message = `
📊 <b>Rapport Journalier</b>

🚗 Véhicules actifs: ${report.activeVehicles}
📍 Kilomètres parcourus: ${report.totalKm} km
⏱️ Temps de conduite: ${report.drivingHours}h
⚠️ Alertes: ${report.alertsCount}
    `;
    
    await this.sendMessage(chatId, message);
  }
}

export const telegramService = new TelegramService();
```

## 📧 Email (Resend)

### Service (`services/resendService.ts`)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  async sendInvoice(to: string, invoice: Invoice, pdfBuffer: Buffer): Promise<void> {
    await resend.emails.send({
      from: 'TrackYu GPS <factures@trackyugps.com>',
      to,
      subject: `Facture ${invoice.number}`,
      html: `
        <h1>Facture ${invoice.number}</h1>
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint votre facture d'un montant de ${invoice.total} FCFA.</p>
        <p>Cordialement,<br/>L'équipe TrackYu GPS</p>
      `,
      attachments: [{
        filename: `Facture_${invoice.number}.pdf`,
        content: pdfBuffer
      }]
    });
  }
  
  async sendWelcome(to: string, user: User, tempPassword: string): Promise<void> {
    await resend.emails.send({
      from: 'TrackYu GPS <noreply@trackyugps.com>',
      to,
      subject: 'Bienvenue sur TrackYu GPS',
      html: `
        <h1>Bienvenue ${user.name}!</h1>
        <p>Votre compte a été créé avec succès.</p>
        <p>Vos identifiants:</p>
        <ul>
          <li>Email: ${user.email}</li>
          <li>Mot de passe temporaire: ${tempPassword}</li>
        </ul>
        <p>⚠️ Pensez à changer votre mot de passe lors de votre première connexion.</p>
      `
    });
  }
}

export const emailService = new EmailService();
```

## 🔄 Dispatcher Multi-canal

### Service (`services/notificationDispatcher.ts`)

```typescript
class NotificationDispatcher {
  async send(notification: Notification): Promise<void> {
    const { channel, tenantId } = notification;
    
    switch (channel) {
      case 'SMS':
        await orangeSmsService.sendSms(notification.sms.to, notification.sms.message);
        break;
        
      case 'EMAIL':
        await emailService.send(notification.email);
        break;
        
      case 'TELEGRAM':
        await telegramService.sendMessage(notification.telegram.chatId, notification.telegram.message);
        break;
        
      case 'WHATSAPP':
        await whatsappService.sendMessage(notification.whatsapp.to, notification.whatsapp.message);
        break;
        
      case 'PUSH':
        await pushService.send(notification.push.token, notification.push.payload);
        break;
    }
    
    // Logger l'envoi
    await this.logNotification(notification);
  }
  
  async sendMulti(channels: string[], notification: Notification): Promise<void> {
    await Promise.all(
      channels.map(channel => this.send({ ...notification, channel }))
    );
  }
}

export const notificationDispatcher = new NotificationDispatcher();
```

## 🔧 Ajouter une Nouvelle Intégration

### 1. Créer le service

```typescript
// services/{serviceName}Service.ts
class NewService {
  async initialize() { ... }
  async send(data: any) { ... }
}

export const newService = new NewService();
```

### 2. Ajouter les credentials

```typescript
// routes/integrationCredentialsRoutes.ts
router.post('/new-service', async (req, res) => {
  const { apiKey } = req.body;
  // Sauvegarder les credentials chiffrés
});
```

### 3. Exposer via API

```typescript
// routes/sendRoutes.ts
router.post('/new-service', authenticateToken, async (req, res) => {
  await newService.send(req.body);
  res.json({ success: true });
});
```

### 4. Ajouter au dispatcher

```typescript
// notificationDispatcher.ts
case 'NEW_SERVICE':
  await newService.send(notification.newService);
  break;
```

---

*Dernière mise à jour : 2026-02-10*
