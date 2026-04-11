/**
 * OrganizationPanelV2 - Paramètres de l'Organisation
 *
 * Onglets:
 * - Profil: Informations générales de l'entreprise
 * - Localisation: Pays, formats date/heure/nombre
 * - Comptabilité: Exercice, TVA, banques
 * - Numérotation: Séries de documents
 * - Apparence: Logo, couleurs, thème
 * - Notifications: Préférences email, SMS
 * - Sécurité: Clés API, 2FA obligatoire
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Save,
  Globe,
  Palette,
  Bell,
  Shield,
  Upload,
  MapPin,
  Clock,
  Mail,
  Phone,
  Languages,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Key,
  Smartphone,
  AlertTriangle,
  Info,
  Hash,
  Calculator,
  Calendar,
  Banknote,
  Edit2,
  Plus,
  Trash2,
  Loader2,
  Repeat,
  CalendarCheck,
  Scale,
  FileText,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../services/apiLazy';
import { API_BASE_URL } from '../../../utils/apiConfig';
import { getHeaders } from '../../../services/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '../../../utils/logger';
import type { NumberingCounter } from '../../../services/numberingService';
import {
  useNumberingCounters,
  useUpdateCounter,
  useResetCounter,
  MODULE_LABELS,
  generatePreview,
} from '../../../services/numberingService';
import { CURRENCIES } from '../../../lib/currencies';

// Types
interface NumberingSeries {
  id: string;
  module: string;
  label: string;
  prefix: string;
  separator: string;
  startNumber: number;
  currentNumber: number;
  padding: number;
  includeYear: boolean;
  includeMonth: boolean;
  includeSlug: boolean; // NEW: Use tenant slug instead of year
  resetFrequency: 'never' | 'yearly' | 'monthly';
  locked: boolean;
}

interface BankAccount {
  id: string;
  name: string;
  bank: string;
  iban: string;
  bic: string;
  currency: string;
  isDefault: boolean;
}

// Paramètres de facturation récurrente par cycle
interface SubscriptionBillingSettings {
  monthly: {
    generationDay: number; // Jour de génération (1-28)
    dueDayOffset: number; // Jours après génération pour échéance
  };
  quarterly: {
    generationMonthOffset: number; // 0 = 1er mois, 1 = 2ème, 2 = dernier mois du trimestre
    generationDay: number;
    dueEndOfQuarter: boolean; // Échéance fin de trimestre
  };
  annual: {
    generationMonthsBefore: number; // Mois avant échéance pour générer
    dueOnAnniversary: boolean; // Échéance = date anniversaire
  };
  autoGenerateEnabled: boolean; // Activer génération automatique
  notifyOnGeneration: boolean; // Notifier admin quand facture générée
  defaultStatus: 'DRAFT' | 'PENDING'; // Statut des factures générées
}

interface OrganizationSettings {
  // Profil
  name: string;
  legalName?: string;
  registrationNumber?: string;
  taxId?: string;
  description?: string;

  // Contact
  email: string;
  phone: string;
  website?: string;
  address: string;

  // Localisation
  country: string;
  city: string;
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;

  // Comptabilité
  currency: string;
  fiscalYearStart: string; // MM-DD
  currentFiscalYear: number;
  taxRate: number;
  taxName: string;
  taxNumber?: string;
  paymentTerms: number;
  bankAccounts: BankAccount[];

  // Numérotation
  numberingSeries: NumberingSeries[];

  // Abonnements / Facturation récurrente
  subscriptionBilling: SubscriptionBillingSettings;

  // Apparence
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: 'small' | 'default' | 'large';
  borderRadius: 'none' | 'small' | 'default' | 'large';
  sidebarStyle: 'dark' | 'light' | 'colored';
  tableDensity: 'compact' | 'standard' | 'comfortable';

  // Notifications
  emailNotifications: boolean;
  smsNotifications: boolean;
  emailFrom: string;
  emailReplyTo?: string;

  // Sécurité
  require2FA: boolean;
  sessionTimeout: number;
  apiKeysEnabled: boolean;
  ipWhitelist?: string[];

  // Documents Légaux (Uploads)
  legalDocuments?: {
    cgv?: string;
    contract?: string;
    policy?: string;
    guide?: string;
  };
}

// Séries de numérotation par défaut
const DEFAULT_NUMBERING_SERIES: NumberingSeries[] = [
  {
    id: '1',
    module: 'invoice',
    label: 'Factures',
    prefix: 'FAC',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 5,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '2',
    module: 'quote',
    label: 'Devis',
    prefix: 'DEV',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '3',
    module: 'receipt',
    label: 'Reçus',
    prefix: 'REC',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 5,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '4',
    module: 'credit_note',
    label: 'Avoirs',
    prefix: 'AV',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '5',
    module: 'purchase_order',
    label: 'Bons de Commande',
    prefix: 'BC',
    separator: '/',
    startNumber: 1,
    currentNumber: 1,
    padding: 6,
    includeYear: false,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '6',
    module: 'contract',
    label: 'Contrats',
    prefix: 'CTR',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '7',
    module: 'intervention',
    label: 'Interventions',
    prefix: 'INT',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 5,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '8',
    module: 'ticket',
    label: 'Tickets',
    prefix: 'TKT',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 6,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '9',
    module: 'device',
    label: 'Boîtiers',
    prefix: 'BOI',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '10',
    module: 'sim',
    label: 'Cartes SIM',
    prefix: 'SIM',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '11',
    module: 'client',
    label: 'Clients',
    prefix: 'CLI',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 5,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '12',
    module: 'lead',
    label: 'Leads',
    prefix: 'LEAD',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: true,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'yearly',
    locked: false,
  },
  {
    id: '13',
    module: 'prospect',
    label: 'Prospects',
    prefix: 'PRO',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '14',
    module: 'supplier',
    label: 'Fournisseurs',
    prefix: 'FRN',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '15',
    module: 'reseller',
    label: 'Revendeurs',
    prefix: 'REV',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 3,
    includeYear: false,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '16',
    module: 'technician',
    label: 'Techniciens',
    prefix: 'TECH',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 3,
    includeYear: false,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '17',
    module: 'product',
    label: 'Produits',
    prefix: 'PRD',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '18',
    module: 'service',
    label: 'Services',
    prefix: 'SRV',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '19',
    module: 'task',
    label: 'Tâches',
    prefix: 'TSK',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 5,
    includeYear: false,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'never',
    locked: false,
  },
  {
    id: '20',
    module: 'journal_entry',
    label: 'Écritures Journal',
    prefix: 'ECR',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 6,
    includeYear: true,
    includeMonth: true,
    includeSlug: false,
    resetFrequency: 'monthly',
    locked: false,
  },
  {
    id: '21',
    module: 'transfer',
    label: 'Virements',
    prefix: 'VIR',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 5,
    includeYear: true,
    includeMonth: false,
    includeSlug: false,
    resetFrequency: 'yearly',
    locked: false,
  },
  {
    id: '22',
    module: 'vehicle',
    label: 'Véhicules',
    prefix: 'VEH',
    separator: '-',
    startNumber: 1,
    currentNumber: 1,
    padding: 4,
    includeYear: false,
    includeMonth: false,
    includeSlug: true,
    resetFrequency: 'never',
    locked: false,
  },
];

// Valeurs par défaut
const DEFAULT_SETTINGS: OrganizationSettings = {
  name: '',
  email: '',
  phone: '',
  address: '',
  country: 'Sénégal',
  city: 'Dakar',
  timezone: 'Africa/Dakar',
  language: 'fr',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: 'HH:mm',
  numberFormat: 'fr-FR',
  currency: 'XOF',
  fiscalYearStart: '01-01',
  currentFiscalYear: new Date().getFullYear(),
  taxRate: 0,
  taxName: 'TVA',
  paymentTerms: 30,
  bankAccounts: [],
  numberingSeries: DEFAULT_NUMBERING_SERIES,
  subscriptionBilling: {
    monthly: {
      generationDay: 1, // Génération le 1er du mois
      dueDayOffset: 5, // Échéance le 5 du mois
    },
    quarterly: {
      generationMonthOffset: 2, // 2 = dernier mois du trimestre
      generationDay: 1, // Le 1er du mois
      dueEndOfQuarter: true, // Échéance fin de trimestre
    },
    annual: {
      generationMonthsBefore: 2, // 2 mois avant échéance
      dueOnAnniversary: true, // Échéance = date anniversaire
    },
    autoGenerateEnabled: true, // Activer génération auto
    notifyOnGeneration: true, // Notifier admin
    defaultStatus: 'DRAFT', // Factures en brouillon
  },
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  accentColor: '#10b981',
  fontFamily: 'Inter',
  fontSize: 'default',
  borderRadius: 'default',
  sidebarStyle: 'dark',
  tableDensity: 'standard',
  emailNotifications: true,
  smsNotifications: false,
  emailFrom: 'noreply@trackyu.com',
  require2FA: false,
  sessionTimeout: 60,
  apiKeysEnabled: true,
};

// Tabs
const TABS = [
  { id: 'profile', label: 'Profil', icon: Building2 },
  { id: 'location', label: 'Localisation', icon: Globe },
  { id: 'accounting', label: 'Comptabilité', icon: Calculator },
  { id: 'subscriptions', label: 'Abonnements', icon: Repeat },
  { id: 'numbering', label: 'Numérotation', icon: Hash },
  { id: 'legal', label: 'Documents Légaux', icon: Scale },
  { id: 'appearance', label: 'Apparence', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'mobile', label: 'Interface Mobile', icon: Smartphone },
];

// Pays disponibles
const COUNTRIES = [
  { code: 'SN', name: 'Sénégal', timezone: 'Africa/Dakar' },
  { code: 'CI', name: "Côte d'Ivoire", timezone: 'Africa/Abidjan' },
  { code: 'ML', name: 'Mali', timezone: 'Africa/Bamako' },
  { code: 'BF', name: 'Burkina Faso', timezone: 'Africa/Ouagadougou' },
  { code: 'GN', name: 'Guinée', timezone: 'Africa/Conakry' },
  { code: 'TG', name: 'Togo', timezone: 'Africa/Lome' },
  { code: 'BJ', name: 'Bénin', timezone: 'Africa/Porto-Novo' },
  { code: 'NE', name: 'Niger', timezone: 'Africa/Niamey' },
  { code: 'CM', name: 'Cameroun', timezone: 'Africa/Douala' },
  { code: 'GA', name: 'Gabon', timezone: 'Africa/Libreville' },
  { code: 'CG', name: 'Congo', timezone: 'Africa/Brazzaville' },
  { code: 'MA', name: 'Maroc', timezone: 'Africa/Casablanca' },
  { code: 'FR', name: 'France', timezone: 'Europe/Paris' },
];

// Formats de date
const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '20/12/2025' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '12/20/2025' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2025-12-20' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY', example: '20-12-2025' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY', example: '20.12.2025' },
];

// Formats d'heure
const TIME_FORMATS = [
  { value: 'HH:mm', label: '24h (14:30)', example: '14:30' },
  { value: 'HH:mm:ss', label: '24h avec sec (14:30:45)', example: '14:30:45' },
  { value: 'hh:mm A', label: '12h (02:30 PM)', example: '02:30 PM' },
  { value: 'hh:mm:ss A', label: '12h avec sec (02:30:45 PM)', example: '02:30:45 PM' },
];

// Formats de nombre
const NUMBER_FORMATS = [
  { value: 'fr-FR', label: 'Français (1 234 567,89)', example: '1 234 567,89' },
  { value: 'en-US', label: 'Anglais US (1,234,567.89)', example: '1,234,567.89' },
  { value: 'de-DE', label: 'Allemand (1.234.567,89)', example: '1.234.567,89' },
  { value: 'en-GB', label: 'Anglais UK (1,234,567.89)', example: '1,234,567.89' },
];

export const OrganizationPanelV2: React.FC = () => {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [mobileViewTabsConfig, setMobileViewTabsConfig] = useState<Record<string, string[]>>({});

  // Get tenant slug from user or fallback
  const tenantSlug =
    (user as any)?.slug || user?.tenantId?.replace('tenant_', '').split('_')[0]?.toUpperCase() || 'XXX';

  // React Query hooks for numbering
  const { data: apiCounters, isLoading: countersLoading, refetch: refetchCounters } = useNumberingCounters();
  const updateCounterMutation = useUpdateCounter();
  const resetCounterMutation = useResetCounter();

  // API key loaded from tenant settings
  const [apiKey, setApiKey] = useState('');

  // Charger les paramètres depuis l'API (avec support impersonation)
  // Se recharge quand le tenantId change (impersonation)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await api.tenants.getCurrent();

        // Charger les données de base du tenant
        const tenantData: Partial<OrganizationSettings> = {
          name: data.name || data.company_name || '',
          legalName: data.company_name || data.legalName || '',
          registrationNumber: data.registration_number || '',
          email: data.email || data.contact_email || '',
          phone: data.phone || data.contact_phone || '',
          website: data.website || '',
          address: data.address || data.company_address || '',
          city: data.city || data.company_city || '',
          country: data.country || data.company_country || 'CI',
          taxId: data.tax_id || data.company_tax_id || '',
          description: data.description || '',
          logoUrl: data.logo || data.logo_url || '',
          primaryColor: data.primary_color || '#3b82f6',
          secondaryColor: data.secondary_color || '#1e40af',
          fontFamily: data.settings?.fontFamily || 'Inter',
          fontSize: data.settings?.fontSize || 'default',
          borderRadius: data.settings?.borderRadius || 'default',
        };

        // Charger la config des onglets mobile
        if (data.settings?.mobileViewTabs) {
          setMobileViewTabsConfig(data.settings.mobileViewTabs);
        }

        // Fusionner avec les settings JSONB si présents
        if (data.settings) {
          setSettings((prev) => ({
            ...prev,
            ...tenantData,
            ...data.settings,
            // Préserver les champs de base du tenant sur les settings
            name: tenantData.name || data.settings.name || prev.name,
            email: tenantData.email || data.settings.email || prev.email,
            phone: tenantData.phone || data.settings.phone || prev.phone,
            address: tenantData.address || data.settings.address || prev.address,
            subscriptionBilling: {
              ...DEFAULT_SETTINGS.subscriptionBilling,
              ...data.settings.subscriptionBilling,
            },
          }));
        } else {
          setSettings((prev) => ({
            ...prev,
            ...tenantData,
          }));
        }
        // Load API key from tenant settings
        if (data.settings?.apiKey || data.api_key) {
          setApiKey(data.settings?.apiKey || data.api_key);
        }
        setHasChanges(false);
      } catch (error: unknown) {
        logger.error('Failed to load organization settings:', error);
        showToast(TOAST.CRUD.ERROR_LOAD('paramètres'), 'error');
      }
    };
    loadSettings();
  }, [user?.tenantId]); // Se recharge quand le tenant change

  // Handler de modification
  const handleChange = (field: keyof OrganizationSettings, value: OrganizationSettings[keyof OrganizationSettings]) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Upload logo via /api/upload/logo
  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      showToast(TOAST.VALIDATION.INVALID_FORMAT('logo'), 'error');
      return;
    }
    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      showToast('Format non supporté. Utilisez PNG, JPG, WebP ou SVG.', 'error');
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const { 'Content-Type': _, ...uploadHeaders } = getHeaders();
      const response = await fetch(`${API_BASE_URL}/upload/logo`, {
        method: 'POST',
        credentials: 'include',
        headers: uploadHeaders,
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de l'upload");
      }

      const { url } = await response.json();
      handleChange('logoUrl', url);
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
      showToast(TOAST.CRUD.UPDATED('Logo'), 'success');
    } catch (err: unknown) {
      showToast(mapError(err, 'logo'), 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  // Upload legal document via /api/upload/document
  const handleLegalDocUpload = async (
    docKey: keyof NonNullable<OrganizationSettings['legalDocuments']>,
    file: File
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Le fichier est trop volumineux (max 5 Mo)', 'error');
      return;
    }
    if (file.type !== 'application/pdf') {
      showToast('Format non supporté. Veuillez uploader un fichier PDF.', 'error');
      return;
    }

    setDocUploading(docKey);
    try {
      const formData = new FormData();
      formData.append('document', file);

      const { 'Content-Type': _ct, ...uploadHeaders2 } = getHeaders();
      const response = await fetch(`${API_BASE_URL}/upload/document`, {
        method: 'POST',
        credentials: 'include',
        headers: uploadHeaders2,
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de l'upload");
      }

      const { url } = await response.json();
      setSettings((prev) => ({
        ...prev,
        legalDocuments: {
          ...prev.legalDocuments,
          [docKey]: url,
        },
      }));
      setHasChanges(true);
      showToast(TOAST.CRUD.UPDATED('Document'), 'success');
    } catch (err: unknown) {
      showToast(mapError(err, 'document'), 'error');
    } finally {
      setDocUploading(null);
    }
  };

  // Sauvegarder vers l'API (avec support impersonation)
  const handleSave = async () => {
    setLoading(true);
    try {
      await api.tenants.updateSettings(settings);
      // Sauvegarder la config des onglets mobile séparément (clé dans settings JSONB)
      await api.tenants.updateSettings({ mobileViewTabs: mobileViewTabsConfig });

      // Invalidate branding cache so PDFs pick up new logo/colors immediately
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-view-tabs'] });

      // Apply appearance changes live to the UI via CSS variables
      const fontMap: Record<string, string> = {
        Inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        Roboto: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        Poppins: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        Nunito: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        'Open Sans': "'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        'DM Sans': "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        'Source Sans 3': "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      };
      const sizeMap: Record<string, string> = { small: '14px', default: '16px', large: '18px' };
      const radiusMap: Record<string, string> = { none: '0px', small: '0.25rem', default: '0.5rem', large: '0.75rem' };
      const sidebarMap: Record<string, { bg: string; text: string; border: string }> = {
        dark: { bg: '#0f172a', text: '#e2e8f0', border: '#1e293b' },
        light: { bg: '#ffffff', text: '#1e293b', border: '#e2e8f0' },
        colored: { bg: settings.primaryColor, text: '#ffffff', border: 'rgba(255,255,255,0.15)' },
      };
      const densityMap: Record<string, string> = { compact: '0.375rem', standard: '0.75rem', comfortable: '1.25rem' };
      const sidebar = sidebarMap[settings.sidebarStyle || 'dark'];
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', settings.primaryColor);
      root.style.setProperty('--brand-secondary', settings.secondaryColor);
      root.style.setProperty('--brand-accent', settings.accentColor || '#10b981');
      root.style.setProperty('--brand-font', fontMap[settings.fontFamily] || fontMap['Inter']);
      root.style.setProperty('--brand-font-size', sizeMap[settings.fontSize] || '16px');
      root.style.setProperty('--brand-radius', radiusMap[settings.borderRadius] || '0.5rem');
      root.style.setProperty('--brand-sidebar-bg', sidebar.bg);
      root.style.setProperty('--brand-sidebar-text', sidebar.text);
      root.style.setProperty('--brand-sidebar-border', sidebar.border);
      root.style.setProperty('--brand-density-py', densityMap[settings.tableDensity || 'standard']);
      root.setAttribute('data-sidebar', settings.sidebarStyle || 'dark');
      root.setAttribute('data-density', settings.tableDensity || 'standard');
      // Load Google Font if not Inter
      if (settings.fontFamily && settings.fontFamily !== 'Inter') {
        const id = `gfont-${settings.fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
        if (!document.getElementById(id)) {
          const link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(settings.fontFamily)}:wght@400;500;600;700&display=swap`;
          document.head.appendChild(link);
        }
      }

      showToast(TOAST.ADMIN.CONFIG_SAVED, 'success');
      setHasChanges(false);
    } catch (error: unknown) {
      showToast(mapError(error, 'paramètres'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Copier API key
  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    showToast(TOAST.CLIPBOARD.COPIED, 'success');
  };

  // Régénérer API key
  const regenerateApiKey = async () => {
    if (
      await confirm({
        message: "Régénérer la clé API? L'ancienne clé sera invalidée.",
        title: 'Régénérer la clé API',
        variant: 'warning',
        confirmLabel: 'Régénérer',
      })
    ) {
      const newKey =
        'tk_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 8);
      setApiKey(newKey);
      try {
        await api.tenants.updateSettings({ ...settings, apiKey: newKey });
        showToast(TOAST.CRUD.CREATED('Clé API'), 'success');
      } catch {
        showToast(mapError(undefined, 'clé API'), 'error');
      }
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar Tabs */}
      <div className="w-56 shrink-0">
        <Card className="p-2">
          <div className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] dark:text-[var(--text-muted)] dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Bouton Sauvegarder - Toujours visible */}
        <button
          onClick={handleSave}
          disabled={loading || !hasChanges}
          className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all ${
            hasChanges
              ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]'
              : 'bg-slate-200 text-[var(--text-muted)] bg-[var(--bg-elevated)] dark:text-[var(--text-secondary)] cursor-not-allowed'
          } disabled:opacity-50`}
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {hasChanges ? 'Enregistrer' : 'Aucun changement'}
        </button>
      </div>

      {/* Content */}
      <Card className="flex-1 p-6 overflow-y-auto">
        {/* Tab: Profil */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Profil de l'organisation</h3>
              <p className="text-sm text-[var(--text-secondary)]">Informations générales de votre entreprise</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Nom Commercial <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="TrackYu GPS"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Raison Sociale
                </label>
                <input
                  type="text"
                  value={settings.legalName || ''}
                  onChange={(e) => handleChange('legalName', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  placeholder="TrackYu Technologies SARL"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">N° RCCM</label>
                <input
                  type="text"
                  value={settings.registrationNumber || ''}
                  onChange={(e) => handleChange('registrationNumber', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  NINEA / N° Fiscal
                </label>
                <input
                  type="text"
                  value={settings.taxId || ''}
                  onChange={(e) => handleChange('taxId', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-10 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Téléphone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    value={settings.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-10 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Site Web</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="url"
                    value={settings.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full pl-10 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="https://www.example.com"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Adresse</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-[var(--text-muted)]" />
                  <textarea
                    value={settings.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full pl-10 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] h-24"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={settings.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] h-24"
                  placeholder="Description de votre activité..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Localisation */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Localisation</h3>
              <p className="text-sm text-[var(--text-secondary)]">Paramètres régionaux et format d'affichage</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Pays</label>
                <select
                  value={settings.country}
                  onChange={(e) => {
                    const country = COUNTRIES.find((c) => c.name === e.target.value);
                    handleChange('country', e.target.value);
                    if (country) handleChange('timezone', country.timezone);
                  }}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  title="Pays"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Ville</label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Fuseau Horaire
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    className="w-full pl-10 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Fuseau horaire"
                  >
                    <option value="Africa/Dakar">Africa/Dakar (GMT+0)</option>
                    <option value="Africa/Abidjan">Africa/Abidjan (GMT+0)</option>
                    <option value="Africa/Lagos">Africa/Lagos (GMT+1)</option>
                    <option value="Africa/Douala">Africa/Douala (GMT+1)</option>
                    <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                    <option value="Africa/Casablanca">Africa/Casablanca (GMT+1)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Langue</label>
                <div className="relative">
                  <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <select
                    value={settings.language}
                    onChange={(e) => handleChange('language', e.target.value)}
                    className="w-full pl-10 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Langue"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Formats */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h4 className="font-bold text-sm text-[var(--text-primary)] mb-4">Formats d'affichage</h4>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Format Date
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => handleChange('dateFormat', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Format date"
                  >
                    {DATE_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Format Heure
                  </label>
                  <select
                    value={settings.timeFormat}
                    onChange={(e) => handleChange('timeFormat', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Format heure"
                  >
                    {TIME_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Format Nombre
                  </label>
                  <select
                    value={settings.numberFormat}
                    onChange={(e) => handleChange('numberFormat', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Format nombre"
                  >
                    {NUMBER_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Aperçu */}
            <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
              <h4 className="font-bold text-sm text-[var(--text-primary)] mb-3">Aperçu</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-secondary)]">Date</p>
                  <p className="font-medium font-mono">
                    {DATE_FORMATS.find((f) => f.value === settings.dateFormat)?.example}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">Heure</p>
                  <p className="font-medium font-mono">
                    {TIME_FORMATS.find((f) => f.value === settings.timeFormat)?.example}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)]">Nombre</p>
                  <p className="font-medium font-mono">{(1234567.89).toLocaleString(settings.numberFormat)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Comptabilité */}
        {activeTab === 'accounting' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Comptabilité</h3>
              <p className="text-sm text-[var(--text-secondary)]">Exercice fiscal, taxes et comptes bancaires</p>
            </div>

            {/* Exercice & Devise */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Devise</label>
                <select
                  value={settings.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  title="Devise"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Exercice Fiscal en Cours
                </label>
                <input
                  type="number"
                  value={settings.currentFiscalYear}
                  onChange={(e) => handleChange('currentFiscalYear', parseInt(e.target.value))}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  min="2020"
                  max="2030"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Début d'Exercice
                </label>
                <select
                  value={settings.fiscalYearStart}
                  onChange={(e) => handleChange('fiscalYearStart', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  title="Début exercice"
                >
                  <option value="01-01">1er Janvier</option>
                  <option value="04-01">1er Avril</option>
                  <option value="07-01">1er Juillet</option>
                  <option value="10-01">1er Octobre</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Délai de Paiement (jours)
                </label>
                <input
                  type="number"
                  value={settings.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', parseInt(e.target.value))}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  min="0"
                  max="90"
                />
              </div>
            </div>

            {/* TVA */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h4 className="font-bold text-sm text-[var(--text-primary)] mb-4">Taxes</h4>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Nom de la Taxe
                  </label>
                  <input
                    type="text"
                    value={settings.taxName}
                    onChange={(e) => handleChange('taxName', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="TVA, TPS..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Taux (%)
                  </label>
                  <input
                    type="number"
                    value={settings.taxRate}
                    onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    N° TVA / Fiscal
                  </label>
                  <input
                    type="text"
                    value={settings.taxNumber || ''}
                    onChange={(e) => handleChange('taxNumber', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="FR123456789"
                  />
                </div>
              </div>
            </div>

            {/* Comptes Bancaires */}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Comptes Bancaires</h4>
                <button className="flex items-center gap-1 text-sm text-[var(--primary)] hover:text-[var(--primary-light)]">
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
              {settings.bankAccounts.length === 0 ? (
                <div className="p-6 text-center text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-lg">
                  <Banknote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun compte bancaire configuré</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {settings.bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {account.bank} - {account.iban}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-1 hover:text-[var(--primary)]">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Abonnements */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Facturation des Abonnements</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Configuration de la génération automatique des factures récurrentes
              </p>
            </div>

            {/* Activation */}
            <div className="p-4 bg-[var(--primary-dim)] rounded-lg border border-[var(--border)]">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--primary-dim)] rounded-lg">
                    <Repeat className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Génération Automatique des Factures</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Les factures seront créées automatiquement selon les règles ci-dessous
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.subscriptionBilling?.autoGenerateEnabled ?? true}
                  onChange={(e) =>
                    handleChange('subscriptionBilling', {
                      ...settings.subscriptionBilling,
                      autoGenerateEnabled: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-[var(--primary)] rounded"
                />
              </label>
            </div>

            {/* Paramètres généraux */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                  Statut des Factures Générées
                </label>
                <select
                  value={settings.subscriptionBilling?.defaultStatus ?? 'DRAFT'}
                  onChange={(e) =>
                    handleChange('subscriptionBilling', {
                      ...settings.subscriptionBilling,
                      defaultStatus: e.target.value as 'PENDING' | 'DRAFT',
                    })
                  }
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  title="Statut des factures"
                >
                  <option value="DRAFT">Brouillon (vérification avant envoi)</option>
                  <option value="PENDING">En attente (prête à envoyer)</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-3 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.subscriptionBilling?.notifyOnGeneration ?? true}
                    onChange={(e) =>
                      handleChange('subscriptionBilling', {
                        ...settings.subscriptionBilling,
                        notifyOnGeneration: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-[var(--primary)] rounded"
                  />
                  <div>
                    <p className="font-medium text-sm">Notification Admin</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Recevoir un email quand une facture est générée
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* MENSUEL */}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-green-600" />
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Abonnements Mensuels</h4>
              </div>
              <div className="grid grid-cols-2 gap-6 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Jour de Génération
                  </label>
                  <select
                    value={settings.subscriptionBilling?.monthly?.generationDay ?? 1}
                    onChange={(e) =>
                      handleChange('subscriptionBilling', {
                        ...settings.subscriptionBilling,
                        monthly: { ...settings.subscriptionBilling?.monthly, generationDay: parseInt(e.target.value) },
                      })
                    }
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Jour de génération"
                  >
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Jour du mois où la facture est générée</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Jour d'Échéance
                  </label>
                  <select
                    value={settings.subscriptionBilling?.monthly?.dueDayOffset ?? 5}
                    onChange={(e) =>
                      handleChange('subscriptionBilling', {
                        ...settings.subscriptionBilling,
                        monthly: { ...settings.subscriptionBilling?.monthly, dueDayOffset: parseInt(e.target.value) },
                      })
                    }
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Jour d'échéance"
                  >
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Jour du mois pour l'échéance de paiement</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-2 italic">
                📅 Exemple: Généré le <strong>1er</strong> du mois, échéance le <strong>5</strong> du mois
              </p>
            </div>

            {/* TRIMESTRIEL */}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 mb-4">
                <CalendarCheck className="w-5 h-5 text-orange-600" />
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Abonnements Trimestriels</h4>
              </div>
              <div className="grid grid-cols-2 gap-6 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Mois de Génération dans le Trimestre
                  </label>
                  <select
                    value={settings.subscriptionBilling?.quarterly?.generationMonthOffset ?? 2}
                    onChange={(e) =>
                      handleChange('subscriptionBilling', {
                        ...settings.subscriptionBilling,
                        quarterly: {
                          ...settings.subscriptionBilling?.quarterly,
                          generationMonthOffset: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Mois dans le trimestre"
                  >
                    <option value={0}>1er mois (Jan, Avr, Juil, Oct)</option>
                    <option value={1}>2ème mois (Fév, Mai, Août, Nov)</option>
                    <option value={2}>3ème mois - Dernier (Mar, Juin, Sep, Déc)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Jour de Génération
                  </label>
                  <select
                    value={settings.subscriptionBilling?.quarterly?.generationDay ?? 1}
                    onChange={(e) =>
                      handleChange('subscriptionBilling', {
                        ...settings.subscriptionBilling,
                        quarterly: {
                          ...settings.subscriptionBilling?.quarterly,
                          generationDay: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    title="Jour de génération"
                  >
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 mt-3">
                <input
                  type="checkbox"
                  checked={settings.subscriptionBilling?.quarterly?.dueEndOfQuarter ?? true}
                  onChange={(e) =>
                    handleChange('subscriptionBilling', {
                      ...settings.subscriptionBilling,
                      quarterly: { ...settings.subscriptionBilling?.quarterly, dueEndOfQuarter: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-orange-600 rounded"
                />
                <span className="text-sm">Échéance à la fin du trimestre en cours</span>
              </label>
              <p className="text-sm text-[var(--text-secondary)] mt-2 italic">
                📅 Exemple: Généré le <strong>1er mars</strong>, échéance <strong>31 mars</strong> (pour couvrir T2)
              </p>
            </div>

            {/* ANNUEL */}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-600" />
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Abonnements Annuels</h4>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                      Délai de Génération (mois avant échéance)
                    </label>
                    <select
                      value={settings.subscriptionBilling?.annual?.generationMonthsBefore ?? 2}
                      onChange={(e) =>
                        handleChange('subscriptionBilling', {
                          ...settings.subscriptionBilling,
                          annual: {
                            ...settings.subscriptionBilling?.annual,
                            generationMonthsBefore: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                      title="Mois avant échéance"
                    >
                      <option value={1}>1 mois avant</option>
                      <option value={2}>2 mois avant</option>
                      <option value={3}>3 mois avant</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.subscriptionBilling?.annual?.dueOnAnniversary ?? true}
                        onChange={(e) =>
                          handleChange('subscriptionBilling', {
                            ...settings.subscriptionBilling,
                            annual: { ...settings.subscriptionBilling?.annual, dueOnAnniversary: e.target.checked },
                          })
                        }
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="text-sm">Échéance = Date anniversaire du contrat</span>
                    </label>
                  </div>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-2 italic">
                📅 Exemple: Contrat expire le <strong>1er avril</strong> → Facture générée le{' '}
                <strong>1er février</strong>, échéance <strong>1er avril</strong>
              </p>
            </div>

            {/* Résumé */}
            <div className="mt-6 p-4 bg-[var(--bg-elevated)] rounded-lg">
              <h4 className="font-bold text-sm text-[var(--text-primary)] mb-3">📊 Résumé de la Configuration</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <p className="font-bold text-green-700 dark:text-green-400">Mensuel</p>
                  <p className="text-[var(--text-secondary)]">
                    Généré le {settings.subscriptionBilling?.monthly?.generationDay ?? 1}
                    <br />
                    Échéance le {settings.subscriptionBilling?.monthly?.dueDayOffset ?? 5}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <p className="font-bold text-orange-700 dark:text-orange-400">Trimestriel</p>
                  <p className="text-[var(--text-secondary)]">
                    Généré le {settings.subscriptionBilling?.quarterly?.generationDay ?? 1} du{' '}
                    {['1er', '2ème', 'dernier'][settings.subscriptionBilling?.quarterly?.generationMonthOffset ?? 2]}{' '}
                    mois
                    <br />
                    Échéance fin trimestre
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <p className="font-bold text-purple-700 dark:text-purple-400">Annuel</p>
                  <p className="text-[var(--text-secondary)]">
                    Généré {settings.subscriptionBilling?.annual?.generationMonthsBefore ?? 2} mois avant
                    <br />
                    Échéance = Anniversaire
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Numérotation */}
        {activeTab === 'numbering' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Séries de Numérotation</h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  Configuration des préfixes et formats de numéros pour chaque module
                </p>
                <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-[var(--border)]">
                  <p className="text-sm text-[var(--primary)]">
                    💡 Votre slug :{' '}
                    <code className="px-2 py-0.5 bg-[var(--primary-dim)] rounded font-mono font-bold">
                      {tenantSlug}
                    </code>
                    <span className="ml-2 text-[var(--text-secondary)]">
                      → Exemple: FAC-<strong>{tenantSlug}</strong>-00001
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => refetchCounters()}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg transition-colors"
                title="Rafraîchir depuis le serveur"
              >
                <RefreshCw className={`w-4 h-4 ${countersLoading ? 'animate-spin' : ''}`} />
                Rafraîchir
              </button>
            </div>

            {countersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
                <span className="ml-3 text-[var(--text-secondary)]">Chargement des compteurs...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--bg-elevated)]">
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">Module</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">Préfixe</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">Sép.</th>
                      <th
                        className="px-3 py-2 text-center font-medium text-[var(--text-secondary)]"
                        title="Inclure le slug du revendeur"
                      >
                        Slug
                      </th>
                      <th className="px-3 py-2 text-center font-medium text-[var(--text-secondary)]">Année</th>
                      <th className="px-3 py-2 text-center font-medium text-[var(--text-secondary)]">Mois</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">Prochain N°</th>
                      <th className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">Aperçu</th>
                      <th className="px-3 py-2 text-center font-medium text-[var(--text-secondary)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {DEFAULT_NUMBERING_SERIES.map((defaultSeries) => {
                      const apiCounter = apiCounters?.find((c) => c.module === defaultSeries.module);
                      const counter =
                        apiCounter ||
                        ({
                          ...defaultSeries,
                          tenantId: user?.tenantId || 'tenant_default',
                          lastResetDate: null,
                          lastNumberDate: null,
                        } as NumberingCounter);
                      const preview = generatePreview(counter, tenantSlug);
                      const label = MODULE_LABELS[counter.module as keyof typeof MODULE_LABELS] || counter.module;

                      return (
                        <tr key={counter.id || counter.module} className="tr-hover/50">
                          <td className="px-3 py-2 font-medium">{label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={counter.prefix}
                              onChange={(e) => {
                                updateCounterMutation.mutate(
                                  {
                                    module: counter.module,
                                    updates: { prefix: e.target.value.toUpperCase() },
                                  },
                                  {
                                    onSuccess: () => showToast(TOAST.CRUD.UPDATED('Préfixe'), 'success'),
                                    onError: (err: unknown) => showToast(mapError(err, 'préfixe'), 'error'),
                                  }
                                );
                              }}
                              className="w-16 px-2 py-1 border rounded text-center font-mono bg-[var(--bg-surface)] border-[var(--border)]"
                              maxLength={5}
                              title="Modifier le préfixe"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={counter.separator}
                              onChange={(e) => {
                                updateCounterMutation.mutate({
                                  module: counter.module,
                                  updates: { separator: e.target.value },
                                });
                              }}
                              className="w-14 px-2 py-1 border rounded bg-[var(--bg-surface)] border-[var(--border)]"
                              title="Choisir le séparateur"
                            >
                              <option value="-">-</option>
                              <option value="/">/</option>
                              <option value="_">_</option>
                              <option value=".">.</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={counter.includeSlug}
                              onChange={(e) => {
                                updateCounterMutation.mutate({
                                  module: counter.module,
                                  updates: {
                                    includeSlug: e.target.checked,
                                    includeYear: e.target.checked ? false : counter.includeYear,
                                    resetFrequency: e.target.checked ? 'never' : counter.resetFrequency,
                                  },
                                });
                              }}
                              className="rounded text-[var(--primary)]"
                              title="Utiliser le slug du revendeur (ex: ABJ)"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={counter.includeYear}
                              onChange={(e) => {
                                updateCounterMutation.mutate({
                                  module: counter.module,
                                  updates: {
                                    includeYear: e.target.checked,
                                    includeSlug: e.target.checked ? false : counter.includeSlug,
                                  },
                                });
                              }}
                              className="rounded"
                              disabled={counter.includeSlug}
                              title="Inclure l'année"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={counter.includeMonth}
                              onChange={(e) => {
                                updateCounterMutation.mutate({
                                  module: counter.module,
                                  updates: { includeMonth: e.target.checked },
                                });
                              }}
                              className="rounded"
                              title="Inclure le mois"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-[var(--text-primary)]">{counter.currentNumber}</span>
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`font-mono ${counter.includeSlug ? 'text-[var(--primary)] font-bold' : 'text-[var(--text-secondary)]'}`}
                            >
                              {preview}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={async () => {
                                if (
                                  await confirm({
                                    message: `Réinitialiser le compteur "${label}" à 1 ?`,
                                    title: 'Réinitialiser le compteur',
                                    variant: 'warning',
                                    confirmLabel: 'Réinitialiser',
                                  })
                                ) {
                                  resetCounterMutation.mutate(counter.module, {
                                    onSuccess: () => showToast(TOAST.CRUD.UPDATED(`Compteur ${label}`), 'success'),
                                    onError: (err: unknown) => showToast(mapError(err, 'compteur'), 'error'),
                                  });
                                }
                              }}
                              className="px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                              title="Réinitialiser le compteur à 1"
                            >
                              Reset
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-[var(--primary-dim)] rounded-lg border border-[var(--border)]">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-[var(--primary)] mt-0.5" />
                <div className="text-sm text-[var(--primary)]">
                  <p className="font-medium">Variables disponibles :</p>
                  <p>
                    • <strong>Slug</strong> : Code unique du revendeur (ex: ABJ, DKR) -{' '}
                    <span className="text-green-600">Recommandé</span>
                  </p>
                  <p>
                    • <strong>Année</strong> : Inclut l'année en cours (2025)
                  </p>
                  <p>
                    • <strong>Mois</strong> : Inclut le mois en cours (01-12)
                  </p>
                  <p>
                    • <strong>Reset</strong> : Remet le compteur à 1 selon la fréquence (désactivé si slug actif)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Documents Légaux */}
        {activeTab === 'legal' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Documents Juridiques</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Gérez les documents contractuels accessibles à vos clients via le Centre d'Aide.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  key: 'cgv',
                  label: 'Conditions Générales de Vente (CGV)',
                  desc: 'Le contrat global pour vos clients',
                },
                { key: 'contract', label: 'Contrat de Service', desc: "Règles et SLAs spécifiques d'utilisation" },
                { key: 'policy', label: 'Politique de Confidentialité', desc: 'Gestion des données personnelles' },
                { key: 'guide', label: 'Guide Utilisateur', desc: "Manuel d'utilisation de la plateforme" },
              ].map((doc) => {
                const docKey = doc.key as keyof NonNullable<OrganizationSettings['legalDocuments']>;
                const docUrl = settings.legalDocuments?.[docKey];

                return (
                  <div
                    key={docKey}
                    className="p-4 border border-[var(--border)] rounded-lg flex items-center justify-between bg-[var(--bg-elevated)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-[var(--primary-dim)] text-[var(--primary)] flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--text-primary)] uppercase text-sm">{doc.label}</h4>
                        <p className="text-xs text-[var(--text-secondary)] mb-1">{doc.desc}</p>
                        {docUrl ? (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--primary)] hover:text-[var(--primary)] flex items-center gap-1 font-medium"
                          >
                            <Eye className="w-3 h-3" /> Voir le document actuel
                          </a>
                        ) : (
                          <span className="text-xs text-orange-500 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Non défini
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        id={`doc-upload-${docKey}`}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await handleLegalDocUpload(docKey, file);
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById(`doc-upload-${docKey}`)?.click()}
                        disabled={docUploading !== null}
                        className="px-4 py-2 border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {docUploading === docKey ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Téléverser (PDF)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-[var(--primary-dim)] rounded-lg flex gap-3 text-sm text-[var(--text-primary)] border border-[var(--border)] mt-6">
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--primary)]" />
              <p>
                Ces documents seront automatiquement accessibles pour tous vos clients via le menu{' '}
                <strong>Service Client & Centre d'aide</strong>. Assurez-vous d'utiliser uniquement des fichiers au
                format PDF.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Apparence */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Apparence</h3>
              <p className="text-sm text-[var(--text-secondary)]">Logo, couleurs, police et style de l'application</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Logo */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-[var(--bg-elevated)] relative cursor-pointer hover:border-[var(--border)] transition-colors"
                    onClick={() => document.getElementById('logo-file-input')?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-[var(--primary)]', 'bg-[var(--primary-dim)]');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary-dim)]');
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-[var(--primary)]', 'bg-[var(--primary-dim)]');
                      const file = e.dataTransfer.files?.[0];
                      if (file) await handleLogoUpload(file);
                    }}
                  >
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-slate-300 mx-auto" />
                        <span className="text-[10px] text-[var(--text-muted)] mt-1">Cliquer ou glisser</span>
                      </div>
                    )}
                    {logoUploading && (
                      <div className="absolute inset-0 bg-white/80 bg-[var(--bg-surface)]/80 flex items-center justify-center rounded-lg">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                      </div>
                    )}
                  </div>
                  <input
                    id="logo-file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleLogoUpload(file);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={settings.logoUrl || ''}
                      onChange={(e) => handleChange('logoUrl', e.target.value)}
                      className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                      placeholder="URL du logo ou uploader un fichier"
                    />
                    <p className="text-xs text-[var(--text-secondary)]">
                      PNG, JPG, WebP ou SVG — max 2 Mo, 200×200px minimum
                    </p>
                  </div>
                </div>
              </div>

              {/* Couleurs */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                  Couleur Primaire
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="flex-1 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                  Couleur Secondaire
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="flex-1 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] font-mono"
                  />
                </div>
              </div>

              {/* Police */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Police</label>
                <select
                  value={settings.fontFamily}
                  onChange={(e) => handleChange('fontFamily', e.target.value)}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                >
                  <option value="Inter">Inter (par défaut)</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Nunito">Nunito</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Source Sans 3">Source Sans 3</option>
                </select>
              </div>

              {/* Taille de texte */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                  Taille de texte
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'small', label: 'Petit', desc: '14px' },
                      { value: 'default', label: 'Normal', desc: '16px' },
                      { value: 'large', label: 'Grand', desc: '18px' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange('fontSize', opt.value)}
                      className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                        settings.fontSize === opt.value
                          ? 'border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)] ring-1 ring-[var(--border)]'
                          : 'border-[var(--border)] hover:border-[var(--border)]'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className="block text-xs text-[var(--text-muted)] mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Arrondi des bords */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                  Arrondi des bords
                </label>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'none', label: 'Aucun', preview: 'rounded-none' },
                      { value: 'small', label: 'Léger', preview: 'rounded' },
                      { value: 'default', label: 'Normal', preview: 'rounded-lg' },
                      { value: 'large', label: 'Arrondi', preview: 'rounded-xl' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange('borderRadius', opt.value)}
                      className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                        settings.borderRadius === opt.value
                          ? 'border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)] ring-1 ring-[var(--border)]'
                          : 'border-[var(--border)] hover:border-[var(--border)]'
                      }`}
                    >
                      <div className={`w-10 h-10 mx-auto mb-2 border-2 border-[var(--border)] ${opt.preview}`} />
                      <span className="block text-sm font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Couleur d'accentuation */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                  Couleur d'accentuation
                </label>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Utilisée pour les indicateurs temps réel (Flotte, Alertes GPS)
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="w-12 h-12 rounded-lg border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="flex-1 p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)] font-mono"
                    placeholder="#10b981"
                  />
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-bold"
                    style={{ backgroundColor: settings.accentColor }}
                  >
                    <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
                    EN MOUVEMENT
                  </div>
                </div>
              </div>

              {/* Style de la barre latérale */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                  Style de la barre latérale
                </label>
                <p className="text-xs text-[var(--text-muted)] mb-2">Apparence du menu de navigation principal</p>
                <div className="flex gap-2">
                  {[
                    { value: 'dark' as const, label: 'Sombre', bg: '#0f172a', text: '#e2e8f0', desc: 'Classique' },
                    { value: 'light' as const, label: 'Clair', bg: '#ffffff', text: '#1e293b', desc: 'Épuré' },
                    {
                      value: 'colored' as const,
                      label: 'Coloré',
                      bg: settings.primaryColor,
                      text: '#ffffff',
                      desc: 'Identitaire',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange('sidebarStyle', opt.value)}
                      className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                        settings.sidebarStyle === opt.value
                          ? 'border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)] ring-1 ring-[var(--border)]'
                          : 'border-[var(--border)] hover:border-[var(--border)]'
                      }`}
                    >
                      <div
                        className="w-10 h-14 mx-auto mb-2 rounded flex flex-col overflow-hidden border border-[var(--border)]"
                        style={{ backgroundColor: opt.bg }}
                      >
                        <div className="flex-1 flex flex-col gap-1 p-1 pt-2">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="h-1.5 rounded-full mx-1"
                              style={{ backgroundColor: i === 1 ? settings.primaryColor : `${opt.text}30` }}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className="block text-xs text-[var(--text-muted)]">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Densité des tableaux */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                  Densité des tableaux
                </label>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Contrôle l'espacement des lignes dans tous les tableaux (Flotte, Finance, Support…)
                </p>
                <div className="flex gap-3">
                  {[
                    {
                      value: 'compact' as const,
                      label: 'Compact',
                      desc: 'Plus de données visibles',
                      rows: [6, 6, 6, 6, 6],
                      gap: 'gap-0.5',
                    },
                    {
                      value: 'standard' as const,
                      label: 'Standard',
                      desc: 'Équilibré — recommandé',
                      rows: [6, 6, 6, 6],
                      gap: 'gap-1',
                    },
                    {
                      value: 'comfortable' as const,
                      label: 'Confortable',
                      desc: 'Lecture facilitée',
                      rows: [6, 6, 6],
                      gap: 'gap-2',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleChange('tableDensity', opt.value)}
                      className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                        settings.tableDensity === opt.value
                          ? 'border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)] ring-1 ring-[var(--border)]'
                          : 'border-[var(--border)] hover:border-[var(--border)]'
                      }`}
                    >
                      <div className={`flex flex-col ${opt.gap} mb-2 px-2`}>
                        {opt.rows.map((_, i) => (
                          <div key={i} className="flex gap-1">
                            <div className="h-1.5 w-8 rounded-full bg-slate-200 bg-[var(--bg-elevated)]" />
                            <div className="h-1.5 flex-1 rounded-full bg-[var(--bg-elevated)]" />
                          </div>
                        ))}
                      </div>
                      <span className="block text-sm font-semibold">{opt.label}</span>
                      <span className="block text-xs text-[var(--text-muted)]">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Aperçu live */}
            <div className="p-5 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
              <h4 className="font-bold text-sm text-[var(--text-primary)] mb-4">Aperçu en direct</h4>
              {(() => {
                const r =
                  { none: '0px', small: '0.25rem', default: '0.5rem', large: '0.75rem' }[settings.borderRadius] ||
                  '0.5rem';
                const fontFamilyMap: Record<string, string> = {
                  Inter: "'Inter', sans-serif",
                  Roboto: "'Roboto', sans-serif",
                  Poppins: "'Poppins', sans-serif",
                  Nunito: "'Nunito', sans-serif",
                  'Open Sans': "'Open Sans', sans-serif",
                  'DM Sans': "'DM Sans', sans-serif",
                  'Source Sans 3': "'Source Sans 3', sans-serif",
                };
                const sidebarBg =
                  { dark: '#0f172a', light: '#ffffff', colored: settings.primaryColor }[settings.sidebarStyle] ||
                  '#0f172a';
                const sidebarText =
                  { dark: '#e2e8f0', light: '#1e293b', colored: '#ffffff' }[settings.sidebarStyle] || '#e2e8f0';
                const sidebarBorder =
                  { dark: '#1e293b', light: '#e2e8f0', colored: 'rgba(255,255,255,0.15)' }[settings.sidebarStyle] ||
                  '#1e293b';
                return (
                  <div
                    className="overflow-hidden border border-[var(--border)] flex"
                    style={{
                      borderRadius: r,
                      fontFamily: fontFamilyMap[settings.fontFamily] || "'Inter', sans-serif",
                      fontSize: { small: '14px', default: '16px', large: '18px' }[settings.fontSize] || '16px',
                    }}
                  >
                    {/* Sidebar preview */}
                    <div
                      className="w-28 flex-shrink-0 p-3 flex flex-col gap-2"
                      style={{ backgroundColor: sidebarBg, borderRight: `1px solid ${sidebarBorder}` }}
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        {settings.logoUrl ? (
                          <img src={settings.logoUrl} alt="Logo" className="w-5 h-5 object-contain" />
                        ) : (
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold"
                            style={{ backgroundColor: settings.primaryColor }}
                          >
                            T
                          </div>
                        )}
                        <span className="text-[10px] font-bold truncate" style={{ color: sidebarText }}>
                          {settings.name || 'TrackYu'}
                        </span>
                      </div>
                      {['Tableau de bord', 'Flotte', 'CRM', 'Finance', 'Support'].map((item, i) => (
                        <div
                          key={item}
                          className="px-2 py-1 rounded text-[9px] font-medium truncate"
                          style={{
                            backgroundColor: i === 0 ? settings.primaryColor : 'transparent',
                            color: i === 0 ? '#ffffff' : `${sidebarText}99`,
                            borderRadius: r,
                          }}
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* Main content preview */}
                    <div className="flex-1 p-3 bg-[var(--bg-surface)]">
                      {/* Buttons */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <button
                          className="px-3 py-1.5 text-white text-[11px] font-medium"
                          style={{ backgroundColor: settings.primaryColor, borderRadius: r }}
                        >
                          Primaire
                        </button>
                        <button
                          className="px-3 py-1.5 text-white text-[11px] font-medium"
                          style={{ backgroundColor: settings.secondaryColor, borderRadius: r }}
                        >
                          Secondaire
                        </button>
                        <button
                          className="px-3 py-1.5 text-[11px] font-medium border-2"
                          style={{
                            borderColor: settings.primaryColor,
                            color: settings.primaryColor,
                            borderRadius: r,
                            background: 'transparent',
                          }}
                        >
                          Outline
                        </button>
                      </div>
                      {/* Accent badges — GPS / Support */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-white text-[10px] font-bold rounded-full"
                          style={{ backgroundColor: settings.accentColor }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse" />
                          EN MOUVEMENT
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700">
                          ALERTE
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-[var(--text-secondary)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                          ARRÊTÉ
                        </span>
                      </div>
                      {/* Fake table row */}
                      <div className="border rounded overflow-hidden" style={{ borderRadius: r }}>
                        <div className="grid grid-cols-3 text-[9px] font-bold uppercase text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 border-b">
                          <span>Véhicule</span>
                          <span>Statut</span>
                          <span>KM</span>
                        </div>
                        {[
                          { v: 'AB-1234-CD', km: '142 340', live: true },
                          { v: 'EF-5678-GH', km: '89 210', live: false },
                        ].map((row) => (
                          <div
                            key={row.v}
                            className="grid grid-cols-3 text-[9px] px-2 border-b last:border-0 items-center"
                            style={{ paddingTop: '0.35rem', paddingBottom: '0.35rem' }}
                          >
                            <span className="font-mono font-semibold">{row.v}</span>
                            <span className="font-bold" style={{ color: row.live ? settings.accentColor : '#94a3b8' }}>
                              {row.live ? '● LIVE' : '○ STOP'}
                            </span>
                            <span className="text-[var(--text-secondary)]">{row.km}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Tab: Notifications */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Notifications</h3>
              <p className="text-sm text-[var(--text-secondary)]">Configuration des notifications système</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--primary-dim)] rounded-lg">
                    <Mail className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Notifications Email</p>
                    <p className="text-sm text-[var(--text-secondary)]">Envoyer des notifications par email</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                  className="w-5 h-5 text-[var(--primary)] rounded"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Notifications SMS</p>
                    <p className="text-sm text-[var(--text-secondary)]">Envoyer des SMS pour les alertes critiques</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                  className="w-5 h-5 text-[var(--primary)] rounded"
                />
              </label>
            </div>

            {settings.emailNotifications && (
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[var(--border)]">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Email Expéditeur
                  </label>
                  <input
                    type="email"
                    value={settings.emailFrom}
                    onChange={(e) => handleChange('emailFrom', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">
                    Email Réponse
                  </label>
                  <input
                    type="email"
                    value={settings.emailReplyTo || ''}
                    onChange={(e) => handleChange('emailReplyTo', e.target.value)}
                    className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                    placeholder="support@trackyu.com"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Sécurité */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Sécurité</h3>
              <p className="text-sm text-[var(--text-secondary)]">Paramètres de sécurité de l'organisation</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Smartphone className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Authentification 2FA Obligatoire</p>
                    <p className="text-sm text-[var(--text-secondary)]">Exiger la 2FA pour tous les utilisateurs</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.require2FA}
                  onChange={(e) => handleChange('require2FA', e.target.checked)}
                  className="w-5 h-5 text-[var(--primary)] rounded"
                />
              </label>

              <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Expiration de Session</p>
                    <p className="text-sm text-[var(--text-secondary)]">Déconnexion automatique après inactivité</p>
                  </div>
                </div>
                <select
                  value={settings.sessionTimeout}
                  onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                  className="w-full p-3 border rounded-lg bg-[var(--bg-surface)] border-[var(--border)]"
                  title="Expiration de session"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={120}>2 heures</option>
                  <option value={480}>8 heures</option>
                </select>
              </div>
            </div>

            {/* Clé API */}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-[var(--text-primary)]">Clé API</h4>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.apiKeysEnabled}
                    onChange={(e) => handleChange('apiKeysEnabled', e.target.checked)}
                    className="rounded"
                  />
                  Activer les clés API
                </label>
              </div>

              {settings.apiKeysEnabled && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      Gardez cette clé secrète. Ne la partagez jamais.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-3 bg-[var(--bg-surface)] rounded-lg font-mono text-sm border">
                      {showApiKey ? apiKey : '••••••••••••••••••••••••'}
                    </div>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-3 border rounded-lg hover:bg-[var(--bg-elevated)]"
                      title={showApiKey ? 'Masquer' : 'Afficher'}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={copyApiKey}
                      className="p-3 border rounded-lg hover:bg-[var(--bg-elevated)]"
                      title="Copier"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={regenerateApiKey}
                      className="p-3 border rounded-lg hover:bg-red-50 text-red-600"
                      title="Régénérer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Tab: Interface Mobile */}
        {activeTab === 'mobile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">Interface Mobile</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Configurez quels onglets sont visibles dans chaque section sur mobile. Décochez pour masquer un onglet
                aux utilisateurs mobiles.
              </p>
            </div>

            {/* TechView */}
            {(() => {
              const techTabs = [
                { id: 'LIST', label: 'Liste des interventions' },
                { id: 'STOCK', label: 'Stock matériel' },
                { id: 'TEAM', label: 'Équipe' },
              ];
              const current: string[] = mobileViewTabsConfig.techView || techTabs.map((t) => t.id);
              return (
                <div className="bg-[var(--bg-elevated)] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-4 h-4 text-[var(--primary)]" />
                    <h4 className="font-semibold text-[var(--text-primary)] text-sm">Section Tech / SAV</h4>
                  </div>
                  {techTabs.map((tab) => (
                    <label
                      key={tab.id}
                      className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 cursor-pointer"
                    >
                      <span className="text-sm text-[var(--text-primary)]">{tab.label}</span>
                      <input
                        type="checkbox"
                        checked={current.includes(tab.id)}
                        onChange={(e) => {
                          const next = e.target.checked ? [...current, tab.id] : current.filter((id) => id !== tab.id);
                          setMobileViewTabsConfig((prev) => ({ ...prev, techView: next }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-[var(--primary)] rounded"
                      />
                    </label>
                  ))}
                </div>
              );
            })()}

            {/* AdminView */}
            {(() => {
              const adminTabs = [
                { id: 'staff', label: 'Équipe' },
                { id: 'devices', label: 'Paramètres Boîtiers' },
                { id: 'help', label: "Centre d'Aide" },
                { id: 'messages', label: 'Messages' },
                { id: 'organization', label: 'Organisation' },
                { id: 'resellers', label: 'Revendeurs' },
              ];
              const current: string[] = mobileViewTabsConfig.adminView || adminTabs.map((t) => t.id);
              return (
                <div className="bg-[var(--bg-elevated)] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-4 h-4 text-purple-500" />
                    <h4 className="font-semibold text-[var(--text-primary)] text-sm">Section Administration</h4>
                  </div>
                  {adminTabs.map((tab) => (
                    <label
                      key={tab.id}
                      className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 cursor-pointer"
                    >
                      <span className="text-sm text-[var(--text-primary)]">{tab.label}</span>
                      <input
                        type="checkbox"
                        checked={current.includes(tab.id)}
                        onChange={(e) => {
                          const next = e.target.checked ? [...current, tab.id] : current.filter((id) => id !== tab.id);
                          setMobileViewTabsConfig((prev) => ({ ...prev, adminView: next }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              );
            })()}

            {/* SupportView */}
            {(() => {
              const supportTabs = [
                { id: 'DASHBOARD', label: 'Dashboard' },
                { id: 'TICKETS', label: 'Tickets' },
                { id: 'LIVECHAT', label: 'Live Chat' },
              ];
              const current: string[] = mobileViewTabsConfig.supportView || supportTabs.map((t) => t.id);
              return (
                <div className="bg-[var(--bg-elevated)] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-4 h-4 text-[var(--primary)]" />
                    <h4 className="font-semibold text-[var(--text-primary)] text-sm">Section Support</h4>
                  </div>
                  {supportTabs.map((tab) => (
                    <label
                      key={tab.id}
                      className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 cursor-pointer"
                    >
                      <span className="text-sm text-[var(--text-primary)]">{tab.label}</span>
                      <input
                        type="checkbox"
                        checked={current.includes(tab.id)}
                        onChange={(e) => {
                          const next = e.target.checked ? [...current, tab.id] : current.filter((id) => id !== tab.id);
                          setMobileViewTabsConfig((prev) => ({ ...prev, supportView: next }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-[var(--primary)] rounded"
                      />
                    </label>
                  ))}
                </div>
              );
            })()}

            {/* MonitoringView */}
            {(() => {
              const monitoringTabs = [
                { id: 'OVERVIEW', label: "Vue d'ensemble" },
                { id: 'OFFLINE', label: 'Silence Radio' },
                { id: 'ANOMALIES', label: 'Anomalies' },
                { id: 'ALERTS', label: "Console d'Alertes" },
              ];
              const current: string[] = mobileViewTabsConfig.monitoringView || monitoringTabs.map((t) => t.id);
              return (
                <div className="bg-[var(--bg-elevated)] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="w-4 h-4 text-orange-500" />
                    <h4 className="font-semibold text-[var(--text-primary)] text-sm">Section Monitoring</h4>
                  </div>
                  {monitoringTabs.map((tab) => (
                    <label
                      key={tab.id}
                      className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0 cursor-pointer"
                    >
                      <span className="text-sm text-[var(--text-primary)]">{tab.label}</span>
                      <input
                        type="checkbox"
                        checked={current.includes(tab.id)}
                        onChange={(e) => {
                          const next = e.target.checked ? [...current, tab.id] : current.filter((id) => id !== tab.id);
                          setMobileViewTabsConfig((prev) => ({ ...prev, monitoringView: next }));
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                    </label>
                  ))}
                </div>
              );
            })()}

            <div className="flex items-start gap-2 p-3 bg-[var(--primary-dim)] rounded-lg text-xs text-[var(--primary)]">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Les modifications s'appliquent après enregistrement. Les onglets masqués restent accessibles sur
                desktop.
              </span>
            </div>
          </div>
        )}
      </Card>
      <ConfirmDialogComponent />
    </div>
  );
};

export default OrganizationPanelV2;
