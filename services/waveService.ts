/**
 * Service Wave Payment
 * Pour recevoir des paiements via Wave (Côte d'Ivoire, Sénégal, etc.)
 * Wave utilise des liens de paiement (pas d'API REST publique)
 */

export interface WaveConfig {
  merchantId: string;           // ID marchand Wave
  merchantName: string;         // Nom affiché sur Wave
  paymentLinkBase: string;      // Lien de base (ex: https://pay.wave.com/m/xxxxxx)
  notificationPhone?: string;   // Téléphone pour notifications
  notificationEmail?: string;   // Email pour notifications
}

export interface WavePaymentLink {
  url: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  customerPhone?: string;
  expiresAt?: Date;
}

export interface WaveTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  customerPhone?: string;
  customerName?: string;
  description: string;
  createdAt: Date;
  completedAt?: Date;
  paymentMethod: 'wave';
}

// Types d'abonnement GPS
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  durationDays: number;
  features: string[];
}

// Abonnements par défaut
export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Mensuel',
    description: 'Abonnement GPS mensuel',
    price: 5000,
    currency: 'XOF',
    durationDays: 30,
    features: ['Suivi temps réel', 'Historique 30 jours', 'Alertes SMS/Email']
  },
  {
    id: 'quarterly',
    name: 'Trimestriel',
    description: 'Abonnement GPS 3 mois',
    price: 12000,
    currency: 'XOF',
    durationDays: 90,
    features: ['Suivi temps réel', 'Historique 90 jours', 'Alertes SMS/Email', 'Rapports mensuels']
  },
  {
    id: 'yearly',
    name: 'Annuel',
    description: 'Abonnement GPS 12 mois',
    price: 40000,
    currency: 'XOF',
    durationDays: 365,
    features: ['Suivi temps réel', 'Historique illimité', 'Alertes SMS/Email', 'Rapports mensuels', 'Support prioritaire']
  }
];

class WaveService {
  private config: WaveConfig | null = null;
  private transactions: WaveTransaction[] = [];
  private plans: SubscriptionPlan[] = DEFAULT_PLANS;

  /**
   * Configure le service avec les infos marchand
   */
  configure(config: WaveConfig) {
    this.config = config;
    this.saveConfig();
  }

  /**
   * Récupère la configuration depuis localStorage
   */
  getConfig(): WaveConfig | null {
    if (this.config) return this.config;
    
    const stored = localStorage.getItem('wave_config');
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
      localStorage.setItem('wave_config', JSON.stringify(this.config));
    }
  }

  /**
   * Vérifie si le service est configuré
   */
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!config?.paymentLinkBase && !!config?.merchantName;
  }

  /**
   * Test la configuration (vérifie que le lien est valide)
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig();
    if (!config?.paymentLinkBase) {
      return { success: false, error: 'Lien de paiement non configuré' };
    }

    // Vérification basique du format du lien
    if (!config.paymentLinkBase.includes('wave.com')) {
      return { success: false, error: 'Le lien doit être un lien Wave valide (wave.com)' };
    }

    return { success: true };
  }

  /**
   * Génère un lien de paiement pour un montant spécifique
   * Wave ne supporte pas les montants dynamiques via URL, donc on retourne le lien de base
   * avec les instructions pour le client
   */
  generatePaymentLink(options: {
    amount: number;
    reference: string;
    description: string;
    customerPhone?: string;
  }): WavePaymentLink {
    const config = this.getConfig();
    if (!config) throw new Error('Wave non configuré');

    // Nettoyer le lien de base (enlever les paramètres existants)
    const baseUrl = config.paymentLinkBase.split('?')[0];
    
    // Wave utilise des liens statiques, on ajoute juste une référence pour le suivi interne
    const link: WavePaymentLink = {
      url: baseUrl,
      amount: options.amount,
      currency: 'XOF',
      reference: options.reference,
      description: options.description,
      customerPhone: options.customerPhone,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    };

    // Sauvegarder la transaction en attente
    this.saveTransaction({
      id: `wave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reference: options.reference,
      amount: options.amount,
      currency: 'XOF',
      status: 'pending',
      customerPhone: options.customerPhone,
      description: options.description,
      createdAt: new Date(),
      paymentMethod: 'wave'
    });

    return link;
  }

  /**
   * Génère un lien de paiement pour un abonnement
   */
  generateSubscriptionLink(options: {
    planId: string;
    vehicleId: string;
    vehicleName: string;
    customerPhone?: string;
    customerName?: string;
  }): WavePaymentLink & { plan: SubscriptionPlan } {
    const plan = this.plans.find(p => p.id === options.planId);
    if (!plan) throw new Error('Plan non trouvé');

    const reference = `SUB-${options.vehicleId}-${Date.now()}`;
    const description = `Abonnement ${plan.name} - ${options.vehicleName}`;

    const link = this.generatePaymentLink({
      amount: plan.price,
      reference,
      description,
      customerPhone: options.customerPhone
    });

    return { ...link, plan };
  }

  /**
   * Sauvegarde une transaction
   */
  private saveTransaction(transaction: WaveTransaction) {
    this.loadTransactions();
    this.transactions.push(transaction);
    localStorage.setItem('wave_transactions', JSON.stringify(this.transactions));
  }

  /**
   * Charge les transactions depuis localStorage
   */
  private loadTransactions() {
    const stored = localStorage.getItem('wave_transactions');
    if (stored) {
      try {
        this.transactions = JSON.parse(stored).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined
        }));
      } catch {
        this.transactions = [];
      }
    }
  }

  /**
   * Récupère toutes les transactions
   */
  getTransactions(): WaveTransaction[] {
    this.loadTransactions();
    return this.transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Récupère une transaction par référence
   */
  getTransactionByReference(reference: string): WaveTransaction | undefined {
    this.loadTransactions();
    return this.transactions.find(t => t.reference === reference);
  }

  /**
   * Met à jour le statut d'une transaction (confirmation manuelle)
   */
  updateTransactionStatus(
    reference: string, 
    status: 'completed' | 'failed' | 'expired',
    customerName?: string
  ): WaveTransaction | null {
    this.loadTransactions();
    const index = this.transactions.findIndex(t => t.reference === reference);
    
    if (index === -1) return null;

    this.transactions[index] = {
      ...this.transactions[index],
      status,
      customerName,
      completedAt: status === 'completed' ? new Date() : undefined
    };

    localStorage.setItem('wave_transactions', JSON.stringify(this.transactions));
    return this.transactions[index];
  }

  /**
   * Récupère les plans d'abonnement
   */
  getPlans(): SubscriptionPlan[] {
    const stored = localStorage.getItem('wave_plans');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return this.plans;
      }
    }
    return this.plans;
  }

  /**
   * Met à jour les plans d'abonnement
   */
  updatePlans(plans: SubscriptionPlan[]) {
    this.plans = plans;
    localStorage.setItem('wave_plans', JSON.stringify(plans));
  }

  /**
   * Génère un message WhatsApp/SMS avec les instructions de paiement
   */
  generatePaymentInstructions(link: WavePaymentLink): string {
    const config = this.getConfig();
    return `
🌊 *Paiement Wave - ${config?.merchantName}*

📋 *Référence:* ${link.reference}
💰 *Montant:* ${link.amount.toLocaleString()} ${link.currency}
📝 *Motif:* ${link.description}

👉 *Pour payer:*
1. Ouvrez Wave sur votre téléphone
2. Scannez le QR code ou cliquez sur le lien:
   ${link.url}
3. Entrez le montant: *${link.amount.toLocaleString()} FCFA*
4. Confirmez avec votre code PIN

⚠️ Important: Indiquez la référence *${link.reference}* dans le motif du paiement.

Merci de votre confiance! 🙏
    `.trim();
  }

  /**
   * Génère un QR code URL (via API gratuite)
   */
  getQRCodeUrl(size: number = 200): string {
    const config = this.getConfig();
    if (!config?.paymentLinkBase) return '';
    
    // Utilise une API gratuite de génération de QR code
    const encodedUrl = encodeURIComponent(config.paymentLinkBase);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
  }

  /**
   * Statistiques des transactions
   */
  getStats(): {
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    totalAmount: number;
    completedAmount: number;
  } {
    this.loadTransactions();
    
    const completed = this.transactions.filter(t => t.status === 'completed');
    const pending = this.transactions.filter(t => t.status === 'pending');

    return {
      totalTransactions: this.transactions.length,
      completedTransactions: completed.length,
      pendingTransactions: pending.length,
      totalAmount: this.transactions.reduce((sum, t) => sum + t.amount, 0),
      completedAmount: completed.reduce((sum, t) => sum + t.amount, 0)
    };
  }

  /**
   * Supprime la configuration
   */
  disconnect() {
    this.config = null;
    localStorage.removeItem('wave_config');
  }
}

export const waveService = new WaveService();
export default waveService;
