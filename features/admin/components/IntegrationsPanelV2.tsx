import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, ExternalLink, Send, Mail, 
  MessageCircle, Bell, Wifi, WifiOff, RefreshCw, Plus, Trash2,
  AlertTriangle, TestTube, Users, Copy, Check, Eye, EyeOff,
  Wallet, QrCode, Link2, DollarSign, Smartphone, Phone, Server
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { telegramService, TelegramBotInfo, TelegramConfig } from '../../../services/telegramService';
import { resendService, ResendConfig } from '../../../services/resendService';
import { waveService, WaveTransaction, WaveConfig } from '../../../services/waveService';
import { whatsappService, WhatsAppConfig } from '../../../services/whatsappService';
import { orangeSmsService, OrangeSmsConfig } from '../../../services/orangeSmsService';
import { integrationService, IntegrationStatusDetail, type IntegrationProvider as IntegrationProviderId } from '../../../services/integrationService';
import { useCurrency } from '../../../hooks/useCurrency';
import { logger } from '../../../utils/logger';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';

// Types
interface IntegrationProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'messaging' | 'email' | 'sms' | 'payment';
  color: string;
  bgColor: string;
  docsUrl: string;
  isConfigured: () => boolean;
  getConfig: () => any;
  configure: (config: Record<string, string>) => void;
  testConnection: () => Promise<{ success: boolean; error?: string; info?: any }>;
  disconnect: () => void;
  configFields: ConfigField[];
}

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea';
  placeholder: string;
  required: boolean;
  helpText?: string;
}

interface SavedChat {
  id: string | number;
  name: string;
  type: string;
}

// Configuration des providers
const PROVIDERS: IntegrationProvider[] = [
  {
    id: 'telegram',
    name: 'Telegram Bot',
    description: 'Envoyez des alertes et rapports via Telegram',
    icon: <Send className="w-6 h-6" />,
    category: 'messaging',
    color: 'text-sky-500',
    bgColor: 'bg-sky-50 dark:bg-sky-900/20',
    docsUrl: 'https://core.telegram.org/bots#creating-a-new-bot',
    isConfigured: () => telegramService.isConfigured(),
    getConfig: () => telegramService.getConfig(),
    configure: (config) => telegramService.configure(config as unknown as TelegramConfig),
    testConnection: async () => {
      const result = await telegramService.testConnection();
      return {
        success: result.success,
        error: result.error,
        info: result.botInfo
      };
    },
    disconnect: () => telegramService.disconnect(),
    configFields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        required: true,
        helpText: 'Créez un bot via @BotFather sur Telegram pour obtenir le token'
      },
      {
        key: 'defaultChatId',
        label: 'Chat ID par défaut (optionnel)',
        type: 'text',
        placeholder: '-1001234567890',
        required: false,
        helpText: 'ID du groupe/canal pour les notifications par défaut'
      }
    ]
  },
  {
    id: 'resend',
    name: 'Resend Email',
    description: 'Envoyez des emails transactionnels modernes',
    icon: <Mail className="w-6 h-6" />,
    category: 'email',
    color: 'text-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    docsUrl: 'https://resend.com/docs',
    isConfigured: () => resendService.isConfigured(),
    getConfig: () => resendService.getConfig(),
    configure: (config) => resendService.configure(config as unknown as ResendConfig),
    testConnection: async () => {
      // Utiliser le backend pour éviter les problèmes CORS
      const result = await integrationService.test('resend');
      return { success: result.success, error: result.error };
    },
    disconnect: () => resendService.disconnect(),
    configFields: [
      {
        key: 'apiKey',
        label: 'Clé API',
        type: 'password',
        placeholder: 're_xxxxxxxxxxxx',
        required: true,
        helpText: 'Clé API disponible dans le dashboard Resend'
      },
      {
        key: 'defaultFrom',
        label: 'Expéditeur par défaut',
        type: 'text',
        placeholder: 'TrackYu GPS <noreply@votredomaine.com>',
        required: true,
        helpText: 'Format: Nom <email@domain.com>'
      }
    ]
  },
  {
    id: 'wave',
    name: 'Wave Payment',
    description: 'Recevez des paiements via Wave (FCFA)',
    icon: <Wallet className="w-6 h-6" />,
    category: 'payment',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    docsUrl: 'https://www.wave.com/fr/business/',
    isConfigured: () => waveService.isConfigured(),
    getConfig: () => waveService.getConfig(),
    configure: (config) => waveService.configure(config as unknown as WaveConfig),
    testConnection: async () => {
      const result = await waveService.testConnection();
      return { success: result.success, error: result.error };
    },
    disconnect: () => waveService.disconnect(),
    configFields: [
      {
        key: 'merchantName',
        label: 'Nom du marchand',
        type: 'text',
        placeholder: 'TrackYu GPS / Votre Entreprise',
        required: true,
        helpText: 'Nom affiché aux clients lors du paiement'
      },
      {
        key: 'merchantId',
        label: 'ID Marchand (optionnel)',
        type: 'text',
        placeholder: 'WAVE-XXXXXX',
        required: false,
        helpText: 'Votre identifiant marchand Wave'
      },
      {
        key: 'paymentLinkBase',
        label: 'Lien de paiement Wave',
        type: 'text',
        placeholder: 'https://pay.wave.com/m/xxxxxx',
        required: true,
        helpText: 'Votre lien de paiement marchand Wave'
      },
      {
        key: 'notificationPhone',
        label: 'Téléphone notifications (optionnel)',
        type: 'text',
        placeholder: '+225 07 XX XX XX XX',
        required: false,
        helpText: 'Numéro pour recevoir les confirmations'
      }
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Envoyez des messages via WhatsApp Cloud API',
    icon: <MessageCircle className="w-6 h-6" />,
    category: 'messaging',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    isConfigured: () => whatsappService.isConfigured(),
    getConfig: () => whatsappService.getConfig(),
    configure: (config) => whatsappService.configure(config as unknown as WhatsAppConfig),
    testConnection: async () => {
      const result = await whatsappService.testConnection();
      return { success: result.success, error: result.error, info: result.phoneNumber };
    },
    disconnect: () => whatsappService.disconnect(),
    configFields: [
      {
        key: 'phoneNumberId',
        label: 'Phone Number ID',
        type: 'text',
        placeholder: '1234567890123456',
        required: true,
        helpText: 'ID du numéro WhatsApp Business (Meta Business Suite)'
      },
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'EAAxxxxxxx...',
        required: true,
        helpText: 'Token d\'accès permanent (System User Token recommandé)'
      },
      {
        key: 'businessAccountId',
        label: 'Business Account ID (optionnel)',
        type: 'text',
        placeholder: '1234567890123456',
        required: false,
        helpText: 'ID du compte WhatsApp Business'
      }
    ]
  },
  {
    id: 'orange_sms',
    name: 'Orange SMS CI',
    description: 'Envoyez des SMS via Orange API (Côte d\'Ivoire)',
    icon: <Smartphone className="w-6 h-6" />,
    category: 'sms',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    docsUrl: 'https://developer.orange.com/apis/sms-ci',
    isConfigured: () => orangeSmsService.isConfigured(),
    getConfig: () => orangeSmsService.getConfig(),
    configure: (config) => orangeSmsService.configure(config as unknown as OrangeSmsConfig),
    testConnection: async () => {
      // Utiliser le backend pour éviter les problèmes CORS
      const result = await integrationService.test('orange_sms');
      return { success: result.success, error: result.error, info: result.info };
    },
    disconnect: () => orangeSmsService.disconnect(),
    configFields: [
      {
        key: 'clientId',
        label: 'Client ID',
        type: 'text',
        placeholder: 'votre-client-id',
        required: true,
        helpText: 'Client ID de votre application Orange Developer'
      },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        placeholder: 'votre-client-secret',
        required: true,
        helpText: 'Client Secret de votre application'
      },
      {
        key: 'senderName',
        label: 'Nom expéditeur (optionnel, max 11 car.)',
        type: 'text',
        placeholder: 'TrackYu',
        required: false,
        helpText: 'Nom affiché à la place du numéro (si autorisé par Orange)'
      }
    ]
  }
];

// Composant principal
export const IntegrationsPanelV2: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [configData, setConfigData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; info?: any } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const { showToast } = useToast();
  const { formatPrice, currency } = useCurrency();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Backend integration status
  const [backendStatus, setBackendStatus] = useState<IntegrationStatusDetail[]>([]);
  const [loadingBackendStatus, setLoadingBackendStatus] = useState(true);

  // Telegram specific
  const [telegramChats, setTelegramChats] = useState<SavedChat[]>([]);
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [selectedChatId, setSelectedChatId] = useState('');

  // Resend specific
  const [testEmail, setTestEmail] = useState('');

  // Wave specific
  const [waveStats, setWaveStats] = useState<{ totalTransactions: number; completedAmount: number } | null>(null);
  const [waveTransactions, setWaveTransactions] = useState<WaveTransaction[]>([]);

  // WhatsApp specific
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappTestMessage, setWhatsappTestMessage] = useState('');
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState<string | null>(null);

  // Orange SMS specific
  const [orangePhone, setOrangePhone] = useState('');
  const [orangeTestMessage, setOrangeTestMessage] = useState('');
  const [orangeBalance, setOrangeBalance] = useState<number | null>(null);
  const [orangeSenderAddress, setOrangeSenderAddress] = useState<string | null>(null);

  const refresh = () => setRefreshKey(k => k + 1);

  // Charger le statut backend au montage
  useEffect(() => {
    const loadBackendStatus = async () => {
      try {
        setLoadingBackendStatus(true);
        const status = await integrationService.getDetailedStatus();
        setBackendStatus(status);
      } catch (error) {
        /* silent */
      } finally {
        setLoadingBackendStatus(false);
      }
    };
    loadBackendStatus();
  }, [refreshKey]);

  // Helper: obtenir le statut backend pour un provider
  const getBackendStatusFor = (providerId: string): IntegrationStatusDetail | undefined => {
    return backendStatus.find(s => s.provider === providerId);
  };

  // Open config modal
  const openConfigModal = (provider: IntegrationProvider) => {
    setSelectedProvider(provider);
    const existingConfig = provider.getConfig() || {};
    const initialData: Record<string, string> = {};
    provider.configFields.forEach(field => {
      initialData[field.key] = existingConfig[field.key] || '';
    });
    setConfigData(initialData);
    setShowSecrets({});
    setIsConfigModalOpen(true);
  };

  // Save configuration
  const handleSaveConfig = async () => {
    if (!selectedProvider) return;
    
    // Validate required fields
    const missingFields = selectedProvider.configFields
      .filter(f => f.required && !configData[f.key])
      .map(f => f.label);
    
    if (missingFields.length > 0) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Configurer le service local
      selectedProvider.configure(configData);
      
      // 2. Persister les credentials dans le backend (chiffré en DB)
      const saveResult = await integrationService.save(selectedProvider.id as IntegrationProviderId, configData);
      if (!saveResult.success) {
        logger.warn(`[Integrations] Backend save warning: ${saveResult.error}`);
      }
      
      // 3. Test connection after saving
      const result = await selectedProvider.testConnection();
      
      if (result.success) {
        showToast(TOAST.ADMIN.CONFIG_SAVED, 'success');
        if (selectedProvider.id === 'telegram' && result.info) {
          setBotInfo(result.info);
        }
        setIsConfigModalOpen(false);
        refresh();
      } else {
        showToast(`Configuration sauvegardée mais test échoué: ${result.error}`, 'warning');
      }
    } catch (error: unknown) {
      showToast(mapError(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection
  const handleTestConnection = async (provider: IntegrationProvider) => {
    setSelectedProvider(provider);
    setTestResult(null);
    setTestMessage('');
    setTestEmail('');
    setSelectedChatId('');
    setIsTestModalOpen(true);
    setIsLoading(true);

    try {
      const result = await provider.testConnection();
      setTestResult(result);
      
      if (result.success && provider.id === 'telegram') {
        setBotInfo(result.info);
        // Fetch recent chats
        const chats = await telegramService.getRecentChats();
        setTelegramChats(chats);
      }
      
      if (result.success && provider.id === 'wave') {
        // Fetch Wave stats and transactions
        setWaveStats(waveService.getStats());
        setWaveTransactions(waveService.getTransactions().slice(0, 5));
      }

      if (result.success && provider.id === 'whatsapp') {
        setWhatsappPhoneNumber(result.info);
      }

      if (result.success && provider.id === 'orange_sms') {
        // result contains { success, senderAddress, balance } from orangeSmsService
        const orangeResult = result as typeof result & { senderAddress?: string; balance?: string; info?: string };
        setOrangeSenderAddress(orangeResult.senderAddress || null);
        setOrangeBalance(orangeResult.balance ?? orangeResult.info ?? null);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Test failed';
      setTestResult({ success: false, error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // Send test message (Telegram)
  const sendTelegramTest = async () => {
    if (!selectedChatId || !testMessage) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await telegramService.sendMessage(selectedChatId, testMessage, { parse_mode: 'HTML' });
      if (result.ok) {
        showToast(TOAST.SUPPORT.MESSAGE_SENT, 'success');
        setTestMessage('');
      } else {
        showToast(mapError(result.description), 'error');
      }
    } catch (error: unknown) {
      showToast(mapError(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Send test message (WhatsApp)
  const sendWhatsAppTest = async () => {
    if (!whatsappPhone || !whatsappTestMessage) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await whatsappService.sendTextMessage(whatsappPhone, whatsappTestMessage);
      if (result.messages?.[0]?.id) {
        showToast(TOAST.SUPPORT.MESSAGE_SENT, 'success');
        setWhatsappTestMessage('');
      } else {
        showToast(mapError(result.error?.message || 'Envoi échoué'), 'error');
      }
    } catch (error: unknown) {
      showToast(mapError(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Send test SMS (Orange)
  const sendOrangeSmsTest = async () => {
    if (!orangePhone || !orangeTestMessage) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await orangeSmsService.sendSms(orangePhone, orangeTestMessage);
      if (result.outboundSMSMessageRequest) {
        showToast(TOAST.COMM.SMS_SENT, 'success');
        setOrangeTestMessage('');
        // Refresh balance via backend
        try {
          const balanceData = await integrationService.getOrangeSmsBalance();
          setOrangeBalance(balanceData.balance);
        } catch (e) {
          /* silent */
        }
      } else {
        showToast(TOAST.COMM.SMS_ERROR, 'error');
      }
    } catch (error: unknown) {
      showToast(mapError(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };


  // Send test email (Resend)
  const sendResendTest = async () => {
    if (!testEmail) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const result = await resendService.sendEmail({
        to: testEmail,
        subject: '🧪 Test TrackYu GPS - Email de test',
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>✅ Configuration Resend réussie!</h2>
            <p>Cet email confirme que votre intégration Resend fonctionne correctement.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #666; font-size: 14px;">TrackYu GPS Tracking System</p>
          </div>
        `
      });

      if (result.id) {
        showToast(TOAST.COMM.EMAIL_SENT(testEmail), 'success');
        setTestEmail('');
      } else {
        showToast(mapError(result.error?.message), 'error');
      }
    } catch (error: unknown) {
      showToast(mapError(error), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect provider
  const handleDisconnect = async (provider: IntegrationProvider) => {
    if (await confirm({ message: `Déconnecter ${provider.name}? La configuration sera supprimée.`, title: 'Déconnecter', variant: 'warning', confirmLabel: 'Déconnecter' })) {
      provider.disconnect();
      showToast(TOAST.CRUD.DELETED(provider.name), 'success');
      refresh();
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(TOAST.CLIPBOARD.COPIED, 'success');
  };

  // Render provider card
  const renderProviderCard = (provider: IntegrationProvider) => {
    // Priorité au statut backend, sinon fallback sur localStorage
    const backendProviderStatus = getBackendStatusFor(provider.id);
    const isConfigured = backendProviderStatus 
      ? (backendProviderStatus.configured && backendProviderStatus.active)
      : provider.isConfigured();
    
    return (
      <Card key={provider.id} className="p-6 flex flex-col h-full hover:shadow-lg transition-shadow">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${provider.bgColor}`}>
            <div className={provider.color}>{provider.icon}</div>
          </div>
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <Wifi className="w-4 h-4" />
                Connecté
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-slate-400">
                <WifiOff className="w-4 h-4" />
                Non configuré
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {provider.name}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 flex-grow">
          {provider.description}
        </p>

        {/* Category badge */}
        <div className="mb-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            provider.category === 'messaging' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' :
            provider.category === 'email' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' :
            provider.category === 'sms' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
          }`}>
            {provider.category === 'messaging' ? '💬 Messagerie' :
             provider.category === 'email' ? '📧 Email' :
             provider.category === 'sms' ? '📱 SMS' : '💳 Paiement'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isConfigured ? (
            <>
              <button
                onClick={() => handleTestConnection(provider)}
                className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
              >
                <TestTube className="w-4 h-4" />
                Tester
              </button>
              <button
                onClick={() => openConfigModal(provider)}
                className="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDisconnect(provider)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Déconnecter"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => openConfigModal(provider)}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Configurer
              </button>
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Documentation"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </Card>
    );
  };

  // Afficher le statut backend pour Resend
  const renderBackendStatusBanner = () => {
    const resendStatus = getBackendStatusFor('resend');
    
    if (loadingBackendStatus) {
      return (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
          <span className="text-sm text-slate-500">Chargement du statut serveur...</span>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-violet-200 dark:border-violet-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <Server className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-medium text-slate-900 dark:text-white">Configuration Serveur</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Statut des intégrations côté backend
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="p-2 hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loadingBackendStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {backendStatus.map(status => (
            <div 
              key={status.provider}
              className={`p-3 rounded-lg ${
                status.configured && status.active 
                  ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
                  : status.configured 
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
                    : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm capitalize text-slate-900 dark:text-white">
                  {status.provider}
                </span>
                {status.configured && status.active ? (
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : status.configured ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {status.source === 'env' && '📦 Variable d\'env'}
                {status.source === 'database' && '🗄️ Base de données'}
                {status.source === 'none' && '⚪ Non configuré'}
              </div>
              {status.configSummary && Object.keys(status.configSummary).length > 0 && (
                <div className="mt-1 text-xs font-mono text-slate-400 truncate">
                  {Object.entries(status.configSummary).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Backend Status Banner */}
      {renderBackendStatusBanner()}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Intégrations
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Connectez vos services de notification et communication
          </p>
        </div>
        <button
          onClick={refresh}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {backendStatus.filter(s => s.configured && s.active).length || PROVIDERS.filter(p => p.isConfigured()).length}
          </div>
          <div className="text-sm text-slate-500">Actives</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {PROVIDERS.filter(p => p.category === 'messaging').length}
          </div>
          <div className="text-sm text-slate-500">Messagerie</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {PROVIDERS.filter(p => p.category === 'email').length}
          </div>
          <div className="text-sm text-slate-500">Email</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {PROVIDERS.length}
          </div>
          <div className="text-sm text-slate-500">Total Disponibles</div>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROVIDERS.map(renderProviderCard)}
        
        {/* Coming Soon Card */}
        <Card className="p-6 flex flex-col h-full border-dashed border-2 opacity-60">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <Bell className="w-6 h-6 text-slate-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-slate-500 mb-2">
            Plus d'intégrations à venir...
          </h3>
          <p className="text-sm text-slate-400 mb-4 flex-grow">
            Orange Money, MTN Mobile Money, Twilio, SendGrid
          </p>
          <span className="text-xs text-slate-400 italic">Bientôt disponible</span>
        </Card>
      </div>

      {/* Config Modal */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={`Configurer ${selectedProvider?.name}`}
      >
        <div className="space-y-6">
          {/* Doc link */}
          {selectedProvider && (
            <a
              href={selectedProvider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <ExternalLink className="w-4 h-4" />
              Voir la documentation
            </a>
          )}

          {/* Fields */}
          {selectedProvider?.configFields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                {field.type === 'textarea' ? (
                  <textarea
                    value={configData[field.key] || ''}
                    onChange={(e) => setConfigData({ ...configData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="relative">
                    <input
                      type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                      value={configData[field.key] || ''}
                      onChange={(e) => setConfigData({ ...configData, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 pr-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {field.type === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {field.helpText && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{field.helpText}</p>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setIsConfigModalOpen(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveConfig}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Test Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title={`Test ${selectedProvider?.name}`}
      >
        <div className="space-y-6">
          {/* Connection Status */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : testResult ? (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-center gap-3">
                {testResult.success ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <p className={`font-medium ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {testResult.success ? 'Connexion réussie!' : 'Échec de connexion'}
                  </p>
                  {testResult.error && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{testResult.error}</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Telegram Test */}
          {selectedProvider?.id === 'telegram' && testResult?.success && (
            <div className="space-y-4">
              {/* Bot Info */}
              {botInfo && (
                <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
                  <h4 className="font-medium text-sky-700 dark:text-sky-300 mb-2">Bot connecté</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold">
                      {botInfo.first_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{botInfo.first_name}</p>
                      <p className="text-sm text-slate-500">@{botInfo.username}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Available Chats */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Chats disponibles
                </label>
                {telegramChats.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {telegramChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChatId(String(chat.id))}
                        className={`w-full p-3 text-left rounded-lg border transition-colors ${
                          selectedChatId === String(chat.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{chat.name}</p>
                            <p className="text-xs text-slate-500">{chat.type}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(String(chat.id));
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="Copier l'ID"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Aucun chat trouvé. Envoyez d'abord un message au bot @{botInfo?.username} pour le démarrer.
                  </div>
                )}
              </div>

              {/* Manual Chat ID */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ou entrez un Chat ID manuellement
                </label>
                <input
                  type="text"
                  value={selectedChatId}
                  onChange={(e) => setSelectedChatId(e.target.value)}
                  placeholder="-1001234567890"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              {/* Test Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Message de test
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="🧪 Test TrackYu GPS - Intégration Telegram fonctionnelle!"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <button
                onClick={sendTelegramTest}
                disabled={isLoading || !selectedChatId || !testMessage}
                className="w-full py-2 px-4 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer le message test
              </button>
            </div>
          )}

          {/* Resend Test */}
          {selectedProvider?.id === 'resend' && testResult?.success && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email de test
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <button
                onClick={sendResendTest}
                disabled={isLoading || !testEmail}
                className="w-full py-2 px-4 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Envoyer l'email test
              </button>
            </div>
          )}

          {/* Wave Test */}
          {selectedProvider?.id === 'wave' && testResult?.success && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="text-center">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3">
                  <QrCode className="w-4 h-4 inline mr-1" />
                  QR Code de paiement
                </h4>
                <div className="inline-block p-4 bg-white rounded-xl shadow-sm">
                  <img 
                    src={waveService.getQRCodeUrl(180)} 
                    alt="Wave QR Code"
                    className="w-[180px] h-[180px]"
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Scannez avec l'app Wave pour tester
                </p>
              </div>

              {/* Payment Link */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  <Link2 className="w-4 h-4 inline mr-1" />
                  Lien de paiement
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={waveService.getConfig()?.paymentLinkBase || ''}
                    readOnly
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  />
                  <button
                    onClick={() => copyToClipboard(waveService.getConfig()?.paymentLinkBase || '')}
                    className="px-3 py-2 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 rounded-lg hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              {waveStats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                      {waveStats.totalTransactions}
                    </div>
                    <div className="text-xs text-slate-500">Transactions</div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {waveStats.completedAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">{currency} reçus</div>
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {waveTransactions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Dernières transactions
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {waveTransactions.map((tx) => (
                      <div 
                        key={tx.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatPrice(tx.amount)}
                          </p>
                          <p className="text-xs text-slate-500">{tx.reference}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {tx.status === 'completed' ? 'Payé' : 
                           tx.status === 'pending' ? 'En attente' : 'Échoué'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Wave Link */}
              <a
                href={waveService.getConfig()?.paymentLinkBase}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-4 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Ouvrir le lien Wave
              </a>
            </div>
          )}

          {/* WhatsApp Test */}
          {selectedProvider?.id === 'whatsapp' && testResult?.success && (
            <div className="space-y-4">
              {/* Phone Number Info */}
              {whatsappPhoneNumber && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">Numéro WhatsApp connecté</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{whatsappPhoneNumber}</p>
                      <p className="text-sm text-slate-500">WhatsApp Business</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Numéro destinataire
                </label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+2250700000000"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
                <p className="text-xs text-slate-500 mt-1">Format international sans espaces</p>
              </div>

              {/* Test Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Message de test
                </label>
                <textarea
                  value={whatsappTestMessage}
                  onChange={(e) => setWhatsappTestMessage(e.target.value)}
                  placeholder="🧪 Test TrackYu GPS - Intégration WhatsApp fonctionnelle!"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>

              <button
                onClick={sendWhatsAppTest}
                disabled={isLoading || !whatsappPhone || !whatsappTestMessage}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                Envoyer via WhatsApp
              </button>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                <strong>Note:</strong> Le destinataire doit avoir accepté les messages de votre numéro WhatsApp Business (conversation initiée dans les 24h).
              </div>
            </div>
          )}

          {/* Orange SMS Test */}
          {selectedProvider?.id === 'orange_sms' && testResult?.success && (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-orange-700 dark:text-orange-300">Compte Orange SMS</h4>
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const balanceData = await integrationService.getOrangeSmsBalance();
                        setOrangeBalance(balanceData.balance);
                        showToast(TOAST.CRUD.UPDATED('Solde'), 'success');
                      } catch (error: unknown) {
                        showToast(mapError(error), 'error');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="p-1.5 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-colors"
                    title="Actualiser le solde"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {/* Sender Address (auto-retrieved from API) */}
                {orangeSenderAddress && (
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-orange-200 dark:border-orange-800">
                    <span className="text-slate-600 dark:text-slate-400">Nom expéditeur:</span>
                    <span className="font-mono font-medium text-orange-600 dark:text-orange-400">
                      {orangeSenderAddress}
                    </span>
                  </div>
                )}
                
                {/* Balance Info */}
                {orangeBalance !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Solde SMS disponible:</span>
                    <div className="text-right">
                      <span className={`text-2xl font-bold ${orangeBalance < 100 ? 'text-red-600 dark:text-red-400' : orangeBalance < 500 ? 'text-amber-600 dark:text-amber-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {orangeBalance.toLocaleString()}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">SMS</span>
                    </div>
                  </div>
                )}
                
                {/* Low balance warning */}
                {orangeBalance !== null && orangeBalance < 100 && (
                  <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Solde faible ! Pensez à recharger votre forfait SMS Orange.</span>
                  </div>
                )}
                
                {orangeBalance !== null && orangeBalance >= 100 && orangeBalance < 500 && (
                  <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Solde modéré. Prévoyez un rechargement bientôt.</span>
                  </div>
                )}
              </div>

              {/* Test Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Numéro destinataire
                </label>
                <input
                  type="tel"
                  value={orangePhone}
                  onChange={(e) => setOrangePhone(e.target.value)}
                  placeholder="0700000000 ou +2250700000000"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
                <p className="text-xs text-slate-500 mt-1">Numéro Orange CI</p>
              </div>

              {/* Test Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Message SMS (max 160 caractères)
                </label>
                <textarea
                  value={orangeTestMessage}
                  onChange={(e) => setOrangeTestMessage(e.target.value.substring(0, 160))}
                  placeholder="Test TrackYu GPS - SMS Orange fonctionnel!"
                  rows={2}
                  maxLength={160}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
                <p className="text-xs text-slate-500 mt-1">{orangeTestMessage.length}/160 caractères</p>
              </div>

              <button
                onClick={sendOrangeSmsTest}
                disabled={isLoading || !orangePhone || !orangeTestMessage}
                className="w-full py-2 px-4 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                Envoyer le SMS
              </button>
            </div>
          )}

          {/* Close */}
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setIsTestModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};

export default IntegrationsPanelV2;
