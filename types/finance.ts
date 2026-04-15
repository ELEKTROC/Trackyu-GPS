// types/finance.ts — Quotes, contracts, invoices, payments, accounting

export interface Quote {
  id: string;
  tenantId: string;
  clientId?: string; // Optional for lead-based quotes
  clientName?: string; // Nom du client (tier_name)
  amount: number;
  amountHT?: number; // Montant HT
  currency?: string; // ISO 4217 (XOF, EUR, USD, etc.)
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  items: { description: string; quantity: number; price: number }[];
  createdAt: Date;
  // New fields
  number?: string; // quote_number (DEV-SLUG-XXXXXX)
  date?: string; // Date du devis
  paymentTerms?: string;
  contractId?: string;
  orderNumber?: string;
  vatRate: number;
  generalConditions?: string;
  notes?: string;
  validUntil?: Date; // Date de validité
  leadId?: string; // Référence lead
  subject?: string; // Objet du devis
  bankDetails?: string; // Coordonnées bancaires
  discount?: number; // Remise
  resellerId?: string; // ID revendeur
  resellerName?: string; // Nom revendeur
  licensePlate?: string; // Plaque d'immatriculation
  tier_id?: string; // Compatibilité
  category?: 'STANDARD' | 'INSTALLATION' | 'ABONNEMENT' | 'AUTRES_VENTES'; // Catégorie
}

export interface Contract {
  id: string;
  contractNumber?: string;
  tenantId: string;
  clientId: string;
  clientName?: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED';
  monthlyFee: number;
  vehicleCount: number;
  vehicleIds?: string[]; // Added for vehicle selection
  pdfUrl?: string;
  // New fields for Subscription Management
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMESTRIAL' | 'ANNUAL';
  autoRenew: boolean;
  nextBillingDate?: string;
  items?: { description: string; quantity: number; price: number; catalogItemId?: string }[];
  effectiveDate?: string; // Date d'effet
  generationDate?: string; // Date de génération de facture
  resellerName?: string; // Revendeur
  resellerId?: string; // Added
  subject?: string; // Objet du contrat
  history?: ContractHistoryEvent[]; // Historique structuré
  notes?: string; // Notes (Legacy)
  createdAt?: string;
}

export interface ContractHistoryEvent {
  date: string;
  type: 'CREATION' | 'STATUS_CHANGE' | 'UPDATE' | 'RENEWAL' | 'NOTE' | 'ALERT';
  description: string;
  user?: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  clientId: string;
  clientName?: string; // Added: Client name from API
  number: string;
  subject?: string; // NEW: Added subject field
  date: string;
  dueDate: string;
  amount: number;
  currency?: string; // ISO 4217 (XOF, EUR, USD, etc.)
  amountHT?: number; // Added: Amount before tax
  balance?: number; // Added: Remaining balance to pay
  status:
    | 'DRAFT'
    | 'SENT'
    | 'PAID'
    | 'PARTIALLY_PAID'
    | 'PARTIAL'
    | 'OVERDUE'
    | 'CANCELLED'
    | 'paid'
    | 'pending'
    | 'cancelled';
  items: { description: string; quantity: number; price: number }[];
  // New fields
  paymentTerms?: string;
  contractId?: string;
  invoiceType?: string; // 'FACTURE', 'AVOIR', 'PROFORMA'
  category?: 'STANDARD' | 'INSTALLATION' | 'ABONNEMENT' | 'AUTRES_VENTES'; // Catégorie pour automatisation
  interventionId?: string; // Lien vers l'intervention source
  updateContract?: boolean; // Déclencheur de mise à jour contrat (Checkbox)
  orderNumber?: string;
  vatRate: number; // Stored as a percentage value, e.g., 18
  generalConditions?: string;
  notes?: string;
  paymentDate?: string; // Date de paiement effectif
  resellerId?: string; // Added
  resellerName?: string; // Added
  licensePlate?: string; // Added
  installationDate?: string; // Added for Smart Contract Matching
  tier_id?: string; // Added for compatibility

  // Recovery Fields
  recoveryLevel?: 'NONE' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LITIGATION';
  lastReminderDate?: string;
  nextReminderDate?: string;
  reminderCount?: number; // Added for Recovery View
  paidAmount?: number; // Montant déjà payé
  amountTVA?: number; // Montant TVA
  amountTTC?: number; // Montant TTC
}

export interface JournalEntry {
  id: string;
  tenantId?: string; // Made optional to match usage
  date: string;
  ref: string; // Reference to Invoice, Payment, etc.
  label: string;
  account: string; // Plan comptable (ex: 411100)
  debit: number;
  credit: number;
  journalCode: 'VT' | 'AC' | 'BQ' | 'OD' | 'CA'; // Vente, Achat, Banque, OD, Caisse
  createdAt?: string; // Made optional
}

export interface Payment {
  id: string;
  tenantId: string;
  date: string;
  amount: number;
  currency?: string; // ISO 4217 (XOF, EUR, USD, etc.)
  method:
    | 'VIREMENT'
    | 'CHEQUE'
    | 'ESPECES'
    | 'CB'
    | 'PRELEVEMENT'
    | 'MOBILE_MONEY'
    | 'EXCESS_USAGE'
    | 'CASH'
    | 'BANK_TRANSFER'
    | 'CHECK';
  type: 'INCOMING' | 'OUTGOING';
  reference: string; // Bank ref or Check number
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'FAILED' | 'PENDING';

  // Workflow d'approbation (double validation)
  createdBy?: string; // User ID du créateur
  createdByName?: string;
  approvedBy?: string; // User ID de l'approbateur
  approvedByName?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  requiresApproval?: boolean; // true si montant > seuil
  approvalThreshold?: number; // Seuil au-delà duquel l'approbation est requise

  // Links
  clientId?: string;
  resellerId?: string; // New: Reseller link
  invoiceId?: string; // Legacy: Single invoice link
  invoiceIds?: string[]; // New: Multiple invoices
  allocations?: { invoiceId: string; amount: number }[]; // New: Amount per invoice
  supplierId?: string;

  // Context
  vehicleId?: string;
  contractId?: string;
  attachments?: string[]; // URLs or filenames

  notes?: string;
  error?: string; // Error message from API
  createdAt: string;
}

export interface SupplierInvoice {
  id: string;
  tenantId?: string;
  supplierName: string;
  reference: string;
  label?: string; // Added: Libellé
  date: string;
  dueDate: string;
  amount: number; // TTC
  currency?: string; // ISO 4217 (XOF, EUR, USD, etc.)
  amountHT?: number; // Added: Montant HT
  amountTVA?: number; // Added: Montant TVA
  accountCode?: string; // Added: Compte de charge
  status: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE';
  paymentMethod?: 'CASH' | 'CHECK' | 'TRANSFER' | 'MOBILE_MONEY'; // Added: Mode de paiement
  resellerId?: string; // Added: Lien Revendeur
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  attachments?: string[];
  notes?: string; // Added: Notes
  isRecurring?: boolean; // Added: Dépense récurrente
  recurrencePeriod?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'; // Added: Périodicité
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  tenantId?: string;
  date: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  status: 'PENDING' | 'RECONCILED';
  reference?: string;
  matchedEntryId?: string;
  accountCode?: string; // Added for automatic accounting
}

export interface Budget {
  id: string;
  tenantId?: string;
  year: number;
  category: string; // e.g., "Personnel", "Marketing"
  accountPrefix: string; // e.g., "64", "623" - used to match journal entries
  allocatedAmount: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  tenantId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string; // SIRET / NIF
  paymentTerms?: string; // e.g., "30 days"
  defaultAccountCode?: string; // e.g., "401100"
  createdAt: string;
}

export interface Subscription {
  id: string;
  tierId: string; // Link to Tier (Client or Reseller)
  tenantId: string;
  planId: string; // Link to a Plan (Basic, Pro, Enterprise)
  status: 'ACTIVE' | 'SUSPENDED' | 'CANCELED' | 'EXPIRED';
  startDate: string;
  endDate?: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  amount: number;
  currency: string;
  autoRenew: boolean;
  nextBillingDate: string;
  createdAt: string;
}

export interface CatalogItem {
  id: string;
  tenantId?: string;
  name: string;
  type: 'Produit' | 'Service';
  category: 'Matériel' | 'Abonnement' | 'Prestation' | 'Package';
  price: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  unit: string;
  taxRate?: number;
  sku?: string;
  description?: string;

  // Propriétés pour les Packages
  isPackage?: boolean;
  includesSubscription?: boolean; // Déclenche la logique contrat
  subscriptionDuration?: number; // Durée en mois
  stockReference?: string; // Référence matériel à déstocker (ex: 'FMB920')

  status: 'ACTIVE' | 'INACTIVE';
  resellerId?: string; // Added
  resellerName?: string; // Added

  // New fields for Accounting & Stock
  accountingAccountSale?: string;
  accountingAccountPurchase?: string;
  isSellable?: boolean;
  isPurchasable?: boolean;
  trackStock?: boolean;
  imageUrl?: string;
}
