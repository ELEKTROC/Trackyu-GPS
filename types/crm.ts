// types/crm.ts — CRM entities: clients, leads, tiers, tasks

// Lead status type
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';

export interface ClientContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Client {
  id: string;
  tenantId: string; // Linked to a Reseller/Tenant
  name: string;
  companyName?: string; // Nom de l'entreprise (alias)
  type: 'B2B' | 'B2C';
  status: 'ACTIVE' | 'SUSPENDED' | 'CHURNED' | 'INACTIVE';

  // Contact Principal
  contactName: string;
  email: string;
  phone: string;

  // Contact Secondaire & Adresse
  secondContactName?: string;
  address: string;
  city?: string;
  country?: string;

  // Info Commerciales
  subscriptionPlan: string;
  resellerId?: string;
  resellerName?: string; // Added
  createdAt: Date;
  updatedAt?: Date; // Date de dernière modification
  sector?: string;
  segment?: string; // ex: 'VIP', 'Standard', 'Grand Compte'
  language?: string;

  // Info Financières
  paymentTerms?: string; // ex: '30 jours fin de mois'
  currency?: string;
  paymentStatus?: 'UP_TO_DATE' | 'OVERDUE'; // A jour / Impayés
  balance?: number; // Nouveau champ

  // Liste des contacts additionnels
  contacts?: ClientContact[];

  // Account creation flag
  createUserAccount?: boolean;
}

export interface Lead {
  id: string;
  tenantId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string; // Added
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  potentialValue: number;
  estimatedValue?: number; // Alias for potentialValue for UI compatibility
  assignedTo: string; // User ID (Sales)
  createdAt: Date;
  updatedAt?: Date; // Date de dernière modification
  interestedProducts?: { id: string; name: string; price: number; quantity: number }[]; // Added for Catalog Integration
  notes?: string; // Added
  type?: 'B2B' | 'B2C'; // Added
  sector?: string; // Added
  source?: string; // Lead acquisition source (e.g. 'Site Web', 'Import CSV', 'Parrainage')
  resellerId?: string; // Added
  resellerName?: string; // Added
}

// --- UNIFIED TIER SYSTEM (REFORM 2025) ---
export type TierType = 'CLIENT' | 'SUPPLIER' | 'RESELLER' | 'PROSPECT';

export interface Tier {
  id: string;
  tenantId: string;
  type: TierType;
  name: string;
  slug?: string; // Unique slug for numbering (e.g., ABJ, DKR) - immutable after creation
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'CHURNED';
  accountingCode?: string; // Code auxiliaire (ex: 411CLIENT001)
  resellerId?: string; // Champ direct pour le revendeur associé (CLIENT ou SUPPLIER)
  createdAt: string;
  updatedAt: string;

  // Metadata specific fields
  clientData?: {
    type?: 'B2B' | 'B2C';
    subscriptionPlan?: string;
    fleetSize?: number;
    segment?: string;
    resellerId?: string;
    balance?: number;
    vehicleCount?: number;
    contractCount?: number;
    currency?: string;
    paymentTerms?: string;
    sector?: string;
    language?: string;
  };
  supplierData?: {
    paymentTerms?: string;
    taxId?: string;
    category?: string;
    website?: string;
    balance?: number;
    resellerId?: string; // Revendeur associé
  };
  resellerData?: {
    domain?: string;
    logo?: string;
    activeClients?: number;
    clientCount?: number;
    activity?: string;
    rccm?: string;
    ccNumber?: string;
    managerName?: string;
    fiscalYear?: string;
    // Reseller-specific admin & branding
    siret?: string;
    adminName?: string;
    adminEmail?: string;
    adminPhone?: string;
    brandName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customDomain?: string;
    maxVehicles?: number;
    maxUsers?: number;
    maxClients?: number;
    apiAccess?: boolean;
    modules?: string[];
    permissions?: string[];
    isActive?: boolean;
    quotas?: {
      maxVehicles?: number;
      maxUsers?: number;
      maxClients?: number;
    };
    whiteLabelConfig?: {
      primaryColor?: string;
      secondaryColor?: string;
      logo?: string;
    };
  };

  // Legacy compatibility
  contactName?: string;
  secondContactName?: string;
  createUserAccount?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  reminder?: 'NONE' | '15M' | '30M' | '1H' | '2H' | '1D' | '2D' | '1W'; // Rappel avant échéance
  assignedTo?: string; // User ID
  assignedUserName?: string; // Nom complet (retourné par JOIN)
  clientId?: string; // Client lié à la tâche
  relatedTo?: {
    type: 'LEAD' | 'CLIENT' | 'QUOTE' | 'INVOICE';
    id: string;
    name?: string;
  };
  createdAt: string;
  updatedAt: string;
}
