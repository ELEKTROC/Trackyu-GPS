// types.ts — Backward-compatible re-export from modular types
// All types are now organized in types/ directory by domain.
// This file re-exports everything so existing imports still work.
//
// Domain modules:
//   types/enums.ts        — VehicleStatus, View
//   types/auth.ts         — Permission, Role, SystemUser, User, UserActivity
//   types/admin.ts        — Tenant, Branch, OrganizationProfile, AuditLog
//   types/crm.ts          — Client, ClientContact, Lead, Tier, TierType, Task
//   types/fleet.ts        — Vehicle, TrackedObject, Coordinate, Zone, Driver, Group, POI, Command, etc.
//   types/finance.ts      — Quote, Contract, Invoice, Payment, CatalogItem, Subscription, etc.
//   types/tech.ts         — Intervention, DeviceStock, StockMovement, Tech, TechConfig, etc.
//   types/support.ts      — Ticket, TicketMessage, TicketCategory, TicketSubCategory
//   types/alerts.ts       — Alert, AlertType, AlertSeverity, ALERT_TYPE_CONFIG, AlertConfig, Anomaly
//   types/rules.ts        — MaintenanceRule, ScheduleRule, EcoDrivingProfile
//   types/integrations.ts — Integration, DocumentTemplate, WebhookConfig, HelpArticle
//   types/automation.ts   — AutomationRule, AutomationTriggerType, AutomationActionType
//   types/accounting.ts   — AccountingPeriod (pre-existing)
//   types/audit.ts        — AuditEntry, AuditAction (pre-existing)

export * from './types/index';
import type { VehicleStatus } from './types/enums';

// ---- LEGACY CONTENT BELOW (kept as reference, all definitions moved to types/) ----
// This section is intentionally left empty.
// If you need to add a new type, add it to the appropriate domain file in types/.

/*
  Original content (1632 lines) has been split into 12 domain modules.
  See types/ directory for the source of truth.
*/

export enum View {
  DASHBOARD = 'DASHBOARD',
  MAP = 'MAP',
  FLEET = 'FLEET',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS',
  AGENDA = 'AGENDA', // Calendrier interventions/tâches

  // Business Modules (Containers)
  PRESALES = 'PRESALES', // Contient: Leads, Devis, Catalogue
  SALES = 'SALES', // Contient: Clients, Factures, Contrats

  // Tech & Stock
  STOCK = 'STOCK', // Devices, SIM Cards
  TECH = 'TECH', // Interventions, Scheduling
  MONITORING = 'MONITORING', // Monitoring Technique

  // Support & Admin
  SUPPORT = 'SUPPORT', // Tickets
  ADMIN = 'ADMIN', // Users, Roles, Logs

  // Comptabilité
  ACCOUNTING = 'ACCOUNTING', // SYSCOHADA, Finance

  // Internal Routing (kept for deep linking if needed, but primarily accessed via tabs)
  LEADS = 'LEADS',
  QUOTES = 'QUOTES',
  CATALOG = 'CATALOG',
  CLIENTS = 'CLIENTS',
  INVOICES = 'INVOICES',
  CONTRACTS = 'CONTRACTS',
}

// --- RBAC SYSTEM ---
export type Permission =
  // General Access
  | 'VIEW_DASHBOARD'
  | 'VIEW_MAP'
  | 'VIEW_REPORTS'
  | 'VIEW_LOGS'

  // Fleet
  | 'VIEW_FLEET' // Alias pour accès flotte
  | 'VIEW_VEHICLES'
  | 'CREATE_VEHICLES'
  | 'EDIT_VEHICLES'
  | 'DELETE_VEHICLES'
  | 'VIEW_DRIVERS'
  | 'CREATE_DRIVERS'
  | 'EDIT_DRIVERS'
  | 'DELETE_DRIVERS'

  // Sales & CRM
  | 'VIEW_CRM'
  | 'MANAGE_LEADS' // Legacy
  | 'MANAGE_CLIENTS' // Legacy
  | 'MANAGE_CONTRACTS' // Legacy
  | 'VIEW_LEADS'
  | 'CREATE_LEADS'
  | 'EDIT_LEADS'
  | 'DELETE_LEADS'
  | 'VIEW_CLIENTS'
  | 'CREATE_CLIENTS'
  | 'EDIT_CLIENTS'
  | 'DELETE_CLIENTS'
  | 'VIEW_CONTRACTS'
  | 'CREATE_CONTRACTS'
  | 'EDIT_CONTRACTS'
  | 'DELETE_CONTRACTS'
  | 'VIEW_TASKS'
  | 'CREATE_TASKS'
  | 'EDIT_TASKS'
  | 'DELETE_TASKS'

  // Finance
  | 'VIEW_FINANCE'
  | 'MANAGE_FINANCE' // Comptabilité avancée (écritures, budgets, rapprochement)
  | 'MANAGE_INVOICES' // Legacy
  | 'VIEW_INVOICES'
  | 'CREATE_INVOICES'
  | 'EDIT_INVOICES'
  | 'DELETE_INVOICES'
  | 'VIEW_QUOTES'
  | 'CREATE_QUOTES'
  | 'EDIT_QUOTES'
  | 'DELETE_QUOTES'
  | 'VIEW_PAYMENTS'
  | 'CREATE_PAYMENTS'
  | 'EDIT_PAYMENTS'
  | 'DELETE_PAYMENTS'
  | 'APPROVE_PAYMENTS'
  | 'VIEW_EXPENSES'
  | 'CREATE_EXPENSES'
  | 'EDIT_EXPENSES'
  | 'DELETE_EXPENSES'
  | 'VIEW_JOURNAL_ENTRIES'
  | 'CREATE_JOURNAL_ENTRIES'
  | 'EDIT_JOURNAL_ENTRIES'
  | 'DELETE_JOURNAL_ENTRIES'
  | 'VALIDATE_JOURNAL_ENTRIES'

  // Tech & Stock
  | 'VIEW_TECH'
  | 'MANAGE_INTERVENTIONS' // Legacy
  | 'MANAGE_STOCK' // Legacy
  | 'MANAGE_DEVICES' // Legacy
  | 'VIEW_INTERVENTIONS'
  | 'CREATE_INTERVENTIONS'
  | 'EDIT_INTERVENTIONS'
  | 'DELETE_INTERVENTIONS'
  | 'VIEW_STOCK'
  | 'CREATE_STOCK'
  | 'EDIT_STOCK'
  | 'DELETE_STOCK'
  | 'VIEW_DEVICES'
  | 'CREATE_DEVICES'
  | 'EDIT_DEVICES'
  | 'DELETE_DEVICES'

  // Alerts & Monitoring
  | 'VIEW_ALERTS'
  | 'MANAGE_ALERTS'

  // Fleet management
  | 'MANAGE_FLEET' // Geofences, groupes, règles de maintenance

  // Support
  | 'VIEW_SUPPORT'
  | 'MANAGE_TICKETS' // Legacy
  | 'MANAGE_MACROS' // Gestion des macros de réponse
  | 'VIEW_TICKETS'
  | 'CREATE_TICKETS'
  | 'EDIT_TICKETS'
  | 'DELETE_TICKETS'

  // Administration
  | 'VIEW_ADMIN'
  | 'MANAGE_USERS' // Legacy
  | 'MANAGE_ROLES' // Legacy
  | 'MANAGE_TENANTS' // Gestion des tenants (SuperAdmin)
  | 'MANAGE_SETTINGS' // Paramètres système, intégrations
  | 'MANAGE_FAQ' // Articles d'aide
  | 'VIEW_USERS'
  | 'CREATE_USERS'
  | 'EDIT_USERS'
  | 'DELETE_USERS'
  | 'VIEW_ROLES'
  | 'CREATE_ROLES'
  | 'EDIT_ROLES'
  | 'DELETE_ROLES'
  | 'VIEW_TENANTS'
  | 'CREATE_TENANTS'
  | 'EDIT_TENANTS'
  | 'DELETE_TENANTS';

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem?: boolean;
}

export interface SystemUser {
  id: string;
  tenantId?: string; // Optional: SuperAdmin has no tenant, Reseller Admin has one
  resellerId?: string; // Added for Reseller Logic
  clientId?: string; // For sub-users linked to a client
  branchId?: string; // Branch assignment
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'Actif' | 'Inactif';
  avatar: string;
  permissions: string[];
  currency?: string; // User preference

  // Champs techniques pour le module Intervention
  location?: { lat: number; lng: number };
  specialty?: string;
  jobStatus?: 'BUSY' | 'AVAILABLE';
  region?: string;
  signature?: string; // Signature base64 du technicien (persistante)

  // Identification RH
  matricule?: string; // Numéro matricule / Numéro employé
  cin?: string; // Carte d'identité nationale / CNI / CIN
  ncc?: string; // Numéro de Contribuable / NCC (Côte d'Ivoire)
  rccm?: string; // Registre du Commerce et du Crédit Mobilier
  dateNaissance?: string; // Date de naissance
  lieuNaissance?: string; // Lieu de naissance
  nationalite?: string; // Nationalité
  sexe?: 'M' | 'F' | 'Autre'; // Sexe
  situationFamiliale?: 'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)'; // Situation familiale
  adresse?: string; // Adresse complète
  ville?: string; // Ville
  codePostal?: string; // Code postal
  pays?: string; // Pays

  // Contrat de travail
  dateEmbauche?: string; // Date d'embauche
  typeContrat?: 'CDI' | 'CDD' | 'Stage' | 'Freelance' | 'Prestataire'; // Type de contrat
  departement?: string; // Département
  poste?: string; // Intitulé du poste
  manager?: string; // ID du manager
  salaire?: number; // Salaire (optionnel)

  // Contacts d'urgence
  contactUrgenceNom?: string; // Nom contact urgence
  contactUrgenceTel?: string; // Téléphone contact urgence
  contactUrgenceLien?: string; // Lien de parenté

  // Contacts professionnels (personnes à contacter)
  contacts?: {
    comptabilite?: { name?: string; fonction?: string; phone?: string; email?: string };
    interventions?: { name?: string; fonction?: string; phone?: string; email?: string };
    autre?: { name?: string; fonction?: string; phone?: string; email?: string };
  };

  // Métadonnées
  createdAt?: string | null;
  updatedAt?: string | null;
  lastLogin?: string | null;
  require2FA?: boolean;
  allowedTenants?: string[]; // IDs des organisations auxquelles l'utilisateur a accès (multi-tenant)
  mobileTabs?: string[]; // Onglets mobile configurés par SuperAdmin (override du profil par rôle)
  vehicleIds?: string[]; // Véhicules accessibles (restriction CLIENT)
  allVehicles?: boolean; // Accès à tous les véhicules du tenant
}

// Alias pour compatibilité
export type User = SystemUser;

// --- BUSINESS ENTITIES ---

export interface ClientContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  currency?: string; // Reseller/Tenant default currency
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
  subscriptionNumber?: string; // Numéro d'abonnement lié
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
    | 'cancelled'
    | 'PAYÉ';
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
  isDisputed?: boolean; // Litige en cours
  promiseToPayDate?: string; // Date de promesse de paiement
  accountingStatus?: string; // Statut comptable
  paidDate?: string; // Date de paiement (alias de paymentDate)
  contractNumber?: string; // Numéro de contrat lié
}

export interface TicketMessage {
  id: string;
  ticketId?: string;
  sender: 'CLIENT' | 'SUPPORT' | 'SYSTEM' | string;
  text: string;
  isInternal?: boolean;
  date: Date;
  createdAt?: string;
  attachments?: string[]; // URLs or base64 strings
}

export interface Ticket {
  id: string;
  tenantId: string;
  clientId: string;
  clientName?: string; // Nom du client (depuis JOIN backend)
  vehicleId?: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  subCategory?: string;
  interventionType?: string;
  messages: TicketMessage[];
  assignedTo?: string; // User ID
  assignedUserName?: string; // Nom de l'utilisateur assigné (depuis JOIN backend)
  location?: string; // Adresse/lieu du ticket
  contactPhone?: string; // Téléphone de contact
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date; // Date de prise en charge (passage à IN_PROGRESS)
  resolvedAt?: Date; // Date de résolution (passage à RESOLVED)
  closedAt?: Date; // Date de clôture (passage à CLOSED)
  firstResponseAt?: Date; // Date de première réponse
  dueDate?: string; // Date d'échéance
  tags?: string[]; // Tags/étiquettes
  source?: 'TrackYu' | 'Appel' | 'WhatsApp' | 'Visite' | 'SMS'; // Canal de réception de la demande
  receivedAt?: Date; // Date de réception effective de la demande
  resellerId?: string;
  resellerName?: string;
  // Creator tracking
  createdBy?: string; // User ID qui a créé le ticket
  createdByName?: string; // Nom de l'utilisateur (depuis JOIN backend)
  // Escalation tracking
  escalationCount?: number; // Nombre d'escalades
  escalatedAt?: Date; // Date de dernière escalade
  escalatedBy?: string; // User ID qui a escaladé
}

// Types d'intervention (alignés avec le schéma Zod interventionSchema)
export type InterventionType =
  | 'INSTALLATION'
  | 'DEPANNAGE'
  | 'RETRAIT'
  | 'TRANSFERT'
  | 'REINSTALLATION'
  | 'REMPLACEMENT'
  | 'SIM'
  | 'BALISE'
  | 'JAUGE'
  | 'ACCESSOIRES'
  | 'AUTRES';
// Natures d'intervention (sous-catégories)
export type InterventionNature =
  | 'Installation'
  | 'Remplacement'
  | 'Transfert'
  | 'Retrait'
  | 'Réinstallation'
  | 'Contrôle branchements'
  | 'Recalibrage sonde'
  | 'Maintenance'
  | 'Diagnostic'
  | 'Dépannage'
  | 'Désinstallation';

export interface Intervention {
  id: string;
  tenantId: string;
  ticketId?: string;
  createdAt: string; // Date de création de la demande (ISO)
  startTime?: string; // Date/Heure de début de l'intervention
  vehicleId?: string;
  clientId: string;
  contactName?: string; // Nom du contact client
  contactPhone?: string; // Téléphone du contact client
  technicianId: string | 'UNASSIGNED';
  resellerId?: string; // Added
  resellerName?: string; // Nom du revendeur pour affichage
  branchId?: string; // Branche assignée
  description?: string; // Description de l'intervention

  type: InterventionType;
  nature: InterventionNature;

  // Status mis à jour
  status: 'PENDING' | 'SCHEDULED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';

  scheduledDate: string; // ISO Date string
  endTime?: string; // Date de fin réelle (Clôture)
  enRouteTime?: string; // Date/Heure de départ en route
  duration: number; // en minutes
  location: string;
  address?: string; // Adresse de l'intervention

  // *** NOUVEAU CHAMP DEMANDÉ ***
  cost?: number; // Montant de l'intervention (sans devise)
  invoiceItems?: {
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    price?: number;
    total?: number;
  }[]; // Détail facturation

  // Identifiants Véhicule
  licensePlate?: string; // Plaque Définitive
  tempPlate?: string; // WW
  wwPlate?: string; // Alias de tempPlate (plaque WW)
  vin?: string; // Châssis
  vehicleName?: string; // Nom du véhicule
  vehicleType?: string; // Type d'engin (e.g., Camion, VUL, Engin TP)

  // Lien Contrat (Logique Abonnement)
  contractId?: string; // Contrat rattaché ou généré
  updateContract?: boolean; // Ajout au contrat (Installation/Package)
  generateInvoice?: boolean; // Générer la facture immédiatement
  removeFromContract?: boolean; // Pour le Retrait : Faut-il stopper la facturation ?
  contractRemovalReason?: string; // Motif du retrait du contrat
  removalReason?: string; // Motif du retrait (UI InterventionRequestTab)

  // Infos Véhicule (Onglet Démarrer)
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  vehicleMileage?: number;
  engineHours?: number; // Heures Moteur

  // Check-up Véhicule (Onglet Démarrer)
  checkStart?: boolean;
  checkLights?: boolean;
  checkDashboard?: boolean;
  checkAC?: boolean;
  checkAudio?: boolean;
  checkBattery?: boolean; // Batterie
  observations?: string;

  // Technique & Matériel
  notes?: string;
  material?: string[]; // Liste du matériel (Device models, SIMs, Câbles...)
  imei?: string;
  simCard?: string; // Numéro SIM (06...)
  iccid?: string; // ID Carte SIM (8933...)
  sensorSerial?: string; // Numéro de série Capteur/Accessoire
  deviceLocation?: string; // Emplacement du boîtier (e.g., Tableau de bord, Sous siège)
  beaconType?: string; // Type de balise (BLE, UHF, etc.)
  macAddress?: string; // Adresse MAC du dispositif
  probeType?: 'CANBUS' | 'CAPACITIVE' | 'ULTRASONIC' | string; // Type de sonde

  // Champs Remplacement & Transfert (Onglet Terminer)
  newSim?: string;
  newImei?: string;
  newGaugeSerial?: string;
  newLicensePlate?: string; // Pour le transfert sur un nouvel engin

  // Champs de Transfert (Mutation)
  targetVehicleId?: string; // Véhicule cible pour le transfert
  targetPlate?: string; // Plaque du véhicule cible
  isClientTransfer?: boolean; // true si le client est différent (génère facture mutation)
  mutationInvoiceId?: string; // ID de la facture mutation générée

  // Champs de traçabilité pour les rotations de matériel (Audit 2025)
  oldDeviceImei?: string; // Pour Remplacement/Retrait
  oldSimId?: string;
  removedMaterialStatus?: 'FUNCTIONAL' | 'FAULTY' | 'DAMAGED' | 'UNKNOWN'; // État du matériel retiré

  // Champs Spécifiques Jauge (Onglet Terminer)
  tankCapacity?: number;
  tankHeight?: number;
  tankWidth?: number;
  tankLength?: number;
  tankShape?: 'RECTANGULAR' | 'CYLINDRICAL_H' | 'CYLINDRICAL_V' | 'L_SHAPE' | 'D_SHAPE'; // Added

  // New Fuel Management Fields
  fuelSensorType?: 'CANBUS' | 'CAPACITIVE' | 'ULTRASONIC';
  calibrationTable?: string; // CSV format: height,volume
  refillThreshold?: number;
  theftThreshold?: number;

  gaugeVoltage?: string;
  gaugeBrand?: string;
  gaugeModel?: string;
  gaugeSerial?: string;
  gaugeTest?: 'OK' | 'NOK';

  // Signatures / Photos (URLs fictives ou base64)
  signatureTech?: string;
  signatureClient?: string;
  photos?: string[];

  // Facturation
  invoiceId?: string; // Lien vers la facture générée
  paymentReceived?: number; // Montant reçu par le technicien
  paymentDeposited?: boolean; // Argent déposé à la caisse
  // Legacy compat aliases
  interventionType?: string; // Alias de type (vue TierDetailModal)
  date?: string; // Alias de scheduledDate pour compatibilité
  technicianName?: string; // Nom du technicien (calculé)
  assignedTo?: string; // Alias de technicianId pour compatibilité
  siteContactName?: string; // Alias de contactName (InterventionRequestTab)
  siteContactPhone?: string; // Alias de contactPhone (InterventionRequestTab)
}

export interface InterventionHistoryLog {
  id: string;
  interventionId: string;
  date: string;
  user: string;
  action: string; // 'CREATION', 'UPDATE_STATUS', 'EDIT', 'ASSIGNMENT'
  details: string;
}

export type DeviceType = 'BOX' | 'SIM' | 'SENSOR' | 'ACCESSORY';

// Alias pour compatibilité avec les anciens imports
export type Device = DeviceStock;

export interface DeviceStock {
  id: string;
  tenantId: string;
  type: DeviceType;
  serialNumber: string; // Generic identifier (IMEI for Box, ICCID for SIM, S/N for others)
  imei?: string; // Kept for backward compatibility
  iccid?: string; // Pour les cartes SIM (Added for explicit access)
  phoneNumber?: string; // Pour les cartes SIM
  operator?: string; // Opérateur SIM (Orange, MTN, etc.)
  model: string;
  status:
    | 'IN_STOCK'
    | 'INSTALLED'
    | 'RMA'
    | 'RMA_PENDING'
    | 'SENT_TO_SUPPLIER'
    | 'REPLACED_BY_SUPPLIER'
    | 'SCRAPPED'
    | 'LOST'
    | 'REMOVED'; // Extended with RMA workflow statuses
  simCardId?: string;
  assignedClientId?: string;
  assignedVehicleId?: string;
  resellerId?: string; // Added
  resellerName?: string; // Added
  client?: string; // Nom du client assigné
  vehicleName?: string; // Nom du véhicule assigné
  vehiclePlate?: string; // Plaque du véhicule assigné (definitive ou WW)
  notes?: string; // Notes additionnelles

  // Stock Management
  location: 'CENTRAL' | 'SIEGE' | 'TECH' | 'CLIENT'; // Localisation physique
  technicianId?: string; // Si location === 'TECH'
  transferStatus?: 'NONE' | 'PENDING_RECEIPT' | 'PENDING_RETURN'; // État du transfert

  // Dates
  entryDate?: string; // Date d'entrée en stock
  installationDate?: string; // Date d'installation
  removalDate?: string; // Date de sortie/retrait
}

export interface StockMovement {
  id: string;
  tenantId: string;
  deviceId: string;
  date: string;
  type: 'ENTRY' | 'TRANSFER' | 'INSTALLATION' | 'REMOVAL' | 'RMA' | 'STATUS_CHANGE';
  fromLocation?: string;
  toLocation?: string;
  fromStatus?: string;
  toStatus?: string;
  userId: string; // User performing the action
  performedBy?: string; // Nom de l'utilisateur
  details?: string;
  notes?: string; // Notes additionnelles
}

// --- EXISTING TYPES ---

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Zone {
  id: string;
  name: string;
  type: 'CIRCLE' | 'POLYGON';
  center?: Coordinate;
  radius?: number; // in meters
  coordinates?: Coordinate[]; // for polygon
  color: string;
  category: 'DEPOT' | 'CLIENT' | 'RESTRICTED' | 'HQ';
}

export interface FuelRecord {
  id: string;
  vehicleId: string;
  date: Date;
  volume: number; // Litres
  cost: number;
  type: 'REFILL' | 'THEFT_ALERT' | 'CONSUMPTION_LOG';
  location?: string;
  driver?: string;
  odometer?: number; // Mileage at time of event
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'TIRES' | 'INSPECTION';
  description: string;
  date: Date;
  cost: number;
  status: 'SCHEDULED' | 'COMPLETED' | 'OVERDUE';
  provider?: string;
  nextDueDate?: Date;
  nextDueMileage?: number;
}

export interface VehiclePositionHistory {
  id: string;
  vehicleId: string;
  timestamp: Date;
  location: Coordinate;
  speed: number;
  heading: number;
  status: VehicleStatus;
  ignition: boolean;
}

/**
 * DeviceStatus — Status of a GPS tracker device in the objects table.
 * Matches the CHECK constraint on objects.device_status.
 */
export type DeviceStatus =
  | 'IN_STOCK'
  | 'INSTALLED'
  | 'DEFECTIVE'
  | 'RETURNED'
  | 'RMA'
  | 'RMA_PENDING'
  | 'SENT_TO_SUPPLIER'
  | 'REPLACED_BY_SUPPLIER'
  | 'SCRAPPED'
  | 'LOST'
  | 'REMOVED';

/**
 * TrackedObject - Unified type for objects table (fusion Vehicle + Device BOX)
 * ABO code is the primary key (id field)
 * This is the source of truth type for the new architecture.
 */
export interface TrackedObject {
  id: string; // ABO-XXXXXX code (primary key)
  subscriptionCode: string; // Same as id (alias for clarity)
  tenantId: string;

  // Device fields (ex-devices BOX)
  imei: string;
  deviceModel?: string;
  deviceSerial?: string;
  protocol?: string;
  deviceStatus?: DeviceStatus;
  deviceLocation?: string;
  technicianId?: string;
  transferStatus?: string;

  // Vehicle fields
  name: string;
  plate?: string;
  vin?: string;
  brand?: string;
  model?: string;
  vehicleType?: string;
  type?: string; // Alias for vehicleType (backward compat)
  driverName?: string;

  // Relationships
  clientId?: string;
  clientName?: string;
  contractId?: string;
  groupId?: string;
  groupName?: string;
  branchId?: string;

  // Telemetry
  status: VehicleStatus;
  speed?: number;
  mileage?: number;
  odometerSource?: 'GPS' | 'CAN' | 'SENSOR' | 'CANBUS';
  fuelLevel?: number;
  batteryVoltage?: number;
  isImmobilized?: boolean;

  // Fuel
  tankCapacity?: number;
  fuelSensorType?: string;
  calibrationTable?: Array<{ voltage: number; liters: number }> | Array<[number, number]>;
  fuelType?: string;
  theoreticalConsumption?: number;
  refillThreshold?: number;
  theftThreshold?: number;
  excessiveIdlingThreshold?: number;
  tankShape?: string;
  tankHeight?: number;
  tankWidth?: number;
  tankLength?: number;

  // Position
  location?: Coordinate;
  heading?: number;
  lastUpdated?: Date;
  lastFuelLiters?: number;

  // Dates
  installDate?: string;
  entryDate?: string;
  createdAt?: string;
  updatedAt?: string;

  // Fuel event aggregates (computed by adapter)
  refuelCount?: number; // Nombre de recharges sur la période
  suspectLossCount?: number; // Nombre de baisses suspectes sur la période
}

/**
 * Vehicle — Extended TrackedObject with backward-compatible aliases.
 *
 * Components use `vehicle.client`, `vehicle.driver`, `vehicle.speed`, etc.
 * These aliases are populated by the api.vehicles.list() adapter layer.
 *
 * New code should prefer TrackedObject fields (clientName, driverName, etc.)
 * but both are available on Vehicle for backward compatibility.
 */
export interface Vehicle extends TrackedObject {
  // Backward-compat aliases (mapped from TrackedObject equivalents)
  client: string; // = clientName || ''
  driver: string; // = driverName || ''

  // Required overrides (TrackedObject has these as optional, Vehicle needs defaults)
  speed: number; // km/h (default 0)
  fuelLevel: number; // percentage (default 0)
  mileage: number; // Kilométrage Total (default 0)
  lastUpdated: Date; // (default to createdAt or epoch)
  location: Coordinate; // (default { lat: 0, lng: 0 })
  branchId: string; // Mandatory: Vehicle MUST belong to a branch

  // Vehicle display/computed fields (not in DB, set by adapter)
  maxSpeed: number;
  destination: string;
  dailyMileage: number;
  driverScore: number;
  nextMaintenance: string;

  // Trip fields (computed from trips table, not stored on objects)
  departureLocation: string;
  departureTime: string;
  arrivalTime: string;
  arrivalLocation: string;
  violationsCount: number;

  // Fuel computed fields
  fuelQuantity: number; // Litres actuels (= lastFuelLiters)
  refuelAmount: number; // Litres ajoutés (Recharge)
  fuelLoss: number; // Litres perdus (Perte)
  consumption: number; // L/100km
  suspectLoss: number; // Litres (Perte suspecte)

  // Organisation compat
  group?: string; // = groupName
  geofence?: string;

  // Identification compat
  licensePlate?: string; // = plate
  wwPlate?: string;
  sim?: string;
  resellerId?: string;

  // Security compat aliases
  isBrokenDown?: boolean;
  immobilized?: boolean; // = isImmobilized
  isBreakdown?: boolean; // = isBrokenDown

  // Media
  photoUrl?: string;

  // Extended telemetry (not in objects table yet)
  engineHours?: number;
  weight?: number;
  temperature?: number;
  batteryLevel?: number; // Tension batterie en V (= batteryVoltage)
  signalStrength?: string;

  // Behavior Stats (computed)
  behaviorStats?: {
    harshBraking: number;
    harshAccel: number;
    sharpTurn: number;
    safetyScore: number;
  };

  // Settings / Form field aliases
  deviceType?: string; // = deviceModel
  odometer?: number; // = mileage

  // Override odometerSource to also accept legacy 'CANBUS' value
  odometerSource?: 'GPS' | 'CAN' | 'SENSOR' | 'CANBUS';

  // Extended display fields
  address?: string; // Adresse textuelle de la position actuelle
  lastTripDistance?: number; // Distance du dernier trajet (km)
  canData?: Record<string, string | number | boolean | null>; // Données CAN bus brutes
  tpms?: Record<number | string, { pressure: number; temperature: number }>; // Pression pneus
  videoEvents?: unknown[]; // Événements vidéo (dashcam)
}

export interface FleetMetrics {
  totalVehicles: number;
  activeVehicles: number;
  totalDistance: number;
  avgFuelEfficiency: number;
  avgDriverScore: number;
  alerts: number;
}

export interface CatalogItem {
  id: string;
  tenantId?: string;
  name: string;
  type: 'Produit' | 'Service';
  category: 'Matériel' | 'Abonnement' | 'Prestation' | 'Package';
  price: number;
  unit: string;
  description?: string;

  // Propriétés pour les Packages
  isPackage?: boolean;
  includesSubscription?: boolean; // Déclenche la logique contrat
  subscriptionDuration?: number; // Durée en mois
  stockReference?: string; // Référence matériel à déstocker (ex: 'FMB920')

  taxRate?: number;
  minPrice?: number;
  maxPrice?: number;
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

export interface Alert {
  id: number | string;
  vehicleId: string;
  vehicleName?: string;
  vehiclePlate?: string; // Plaque du véhicule
  clientId?: string;
  clientName?: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  isRead: boolean;
  read?: boolean; // Alias pour compatibilité
  comment?: string | null;
  treated?: boolean;
  treatedAt?: string | null;
  treatedBy?: string | null;
  createdAt: string;
  timestamp?: string; // Alias pour compatibilité
  latitude?: number; // Position de l'alerte
  longitude?: number;
  value?: number | string; // Valeur associée (vitesse, niveau, etc.)
}

// Types d'alertes système
export type AlertType =
  | 'SPEEDING' // Excès de vitesse
  | 'GEOFENCE' // Entrée/Sortie zone
  | 'FUEL_LEVEL' // Niveau carburant bas
  | 'FUEL_THEFT' // Vol de carburant
  | 'MAINTENANCE' // Alerte maintenance
  | 'SOS' // Bouton SOS
  | 'IGNITION' // Allumage/Extinction
  | 'IDLING' // Ralenti excessif
  | 'BATTERY' // Batterie faible (véhicule ou GPS)
  | 'TOWING' // Remorquage détecté
  | 'JAMMING' // Brouillage GPS
  | 'OFFLINE' // Perte de signal
  | 'POWER_CUT' // Coupure alimentation
  | 'HARSH_BRAKING' // Freinage brusque
  | 'HARSH_ACCEL' // Accélération brusque
  | 'SHARP_TURN' // Virage brusque
  | 'TAMPERING' // Sabotage/Vibration
  | 'CRASH' // Détection accident
  | 'RULE_VIOLATION'; // Violation de règle planifiée

// Niveaux de sévérité
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Configuration des types d'alertes pour l'UI
export const ALERT_TYPE_CONFIG: Record<AlertType, { label: string; icon: string; color: string }> = {
  SPEEDING: { label: 'Excès de vitesse', icon: 'Gauge', color: 'orange' },
  GEOFENCE: { label: 'Zone géographique', icon: 'MapPin', color: 'blue' },
  FUEL_LEVEL: { label: 'Niveau carburant', icon: 'Fuel', color: 'yellow' },
  FUEL_THEFT: { label: 'Vol de carburant', icon: 'AlertTriangle', color: 'red' },
  MAINTENANCE: { label: 'Maintenance', icon: 'Wrench', color: 'purple' },
  SOS: { label: 'SOS Urgence', icon: 'AlertOctagon', color: 'red' },
  IGNITION: { label: 'Moteur', icon: 'Key', color: 'green' },
  IDLING: { label: 'Ralenti excessif', icon: 'Clock', color: 'orange' },
  BATTERY: { label: 'Batterie', icon: 'Battery', color: 'yellow' },
  TOWING: { label: 'Remorquage', icon: 'Truck', color: 'red' },
  JAMMING: { label: 'Brouillage', icon: 'WifiOff', color: 'red' },
  OFFLINE: { label: 'Hors ligne', icon: 'WifiOff', color: 'slate' },
  POWER_CUT: { label: 'Coupure alimentation', icon: 'Zap', color: 'red' },
  HARSH_BRAKING: { label: 'Freinage brusque', icon: 'AlertTriangle', color: 'orange' },
  HARSH_ACCEL: { label: 'Accélération brusque', icon: 'TrendingUp', color: 'orange' },
  SHARP_TURN: { label: 'Virage brusque', icon: 'CornerUpRight', color: 'orange' },
  TAMPERING: { label: 'Sabotage boîtier', icon: 'ShieldAlert', color: 'red' },
  CRASH: { label: 'Accident détecté', icon: 'AlertOctagon', color: 'red' },
  RULE_VIOLATION: { label: 'Violation de règle', icon: 'Ban', color: 'red' },
};

export interface Branch {
  id: string;
  name: string; // Renamed from 'nom' to 'name' for consistency, but keeping 'nom' as alias if needed by legacy code? No, let's stick to 'name' and fix usages.
  tenantId?: string;
  clientId: string;
  isDefault: boolean;
  createdAt: string;

  // Optional legacy/agency fields (deprecated but kept for compatibility if needed)
  ville?: string;
  responsable?: string;
  statut?: 'ACTIVE' | 'INACTIVE';
  email?: string;
  phone?: string;
  description?: string;
  country?: string;
  resellerId?: string;
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
  tierId?: string; // Lien Tier (client/fournisseur)
  ref?: string; // Référence alternative (alias de reference)
  paymentReference?: string; // Référence de paiement fournisseur
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
  vatRate?: number; // Taux de TVA (%)
  invoiceNumber?: string; // Numéro de facture fournisseur
  category?: string; // Catégorie de dépense
  paymentReference?: string; // Référence de paiement
  supplierId?: string; // ID fournisseur lié
  paymentTerms?: string; // Conditions de paiement
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
  paymentMethod?: string; // Moyen de paiement
  tierId?: string; // Lien Tier
  category?: string; // Catégorie de transaction
  notes?: string; // Notes
  resellerId?: string; // Revendeur lié
}

export interface Budget {
  id: string;
  tenantId?: string;
  year: number;
  category: string; // e.g., "Personnel", "Marketing"
  accountPrefix: string; // e.g., "64", "623" - used to match journal entries
  allocatedAmount: number;
  notes?: string;
  monthlyAmounts?: number[]; // Montants mensuels (12 valeurs, index 0=Jan)
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
    modules?: {
      fleet?: boolean;
      interventions?: boolean;
      stock?: boolean;
      crm?: boolean;
      finance?: boolean;
      reports?: boolean;
      alerts?: boolean;
      map?: boolean;
    };
    permissions?: string[];
    isActive?: boolean;
  };

  // Legacy compatibility
  contactName?: string;
  secondContactName?: string;
  createUserAccount?: boolean;
  // Application fields (prospect/lead workflow)
  application?: string; // Type d'application (suivi, carburant, etc.)
  applicationDetail?: string; // Détail de l'application
  taxId?: string; // NIF / SIRET (alias de supplierData.taxId)
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

// --- MONITORING & ANOMALIES (REFORM 2025) ---
export interface Anomaly {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: 'FUEL' | 'GEOFENCE' | 'SPEED' | 'IDLE' | 'MAINTENANCE' | 'OTHER';
  code?: string; // Code de l'anomalie (e.g., 'FUEL_DROP', 'OVERSPEED')
  label?: string; // Libellé court
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp: string;
  description: string;
  value?: string | number;
  unit?: string; // Unité de mesure (L, km/h, etc.)
  duration?: number; // Durée en minutes
  threshold?: string | number;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
}

export interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  email: string;
  role: string;
  lastLogin: string;
  status: 'ONLINE' | 'OFFLINE' | 'AWAY';
  failedAttempts: number;
  accountStatus: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  ipAddress: string;
  location: string;
  // Stats enrichies
  loginCount: number;
  firstLogin: string | null;
  totalActions: number;
  lastActionAt: string | null;
  mostUsedAction: string | null;
  avgLoginsPerWeek: number;
  createdAt: string | null;
}

// --- AUDIT LOGGING ---
export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// --- INTEGRATIONS & TEMPLATES ---

export interface Integration {
  id: string;
  provider: 'ORANGE_SMS' | 'SENDGRID' | 'WHATSAPP' | 'SENTRY' | 'OTHER';
  name: string;
  type: 'SMS' | 'EMAIL' | 'MONITORING' | 'PAYMENT';
  status: 'ACTIVE' | 'INACTIVE';
  config: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentTemplate {
  id: string;
  type: 'INVOICE' | 'CONTRACT' | 'EMAIL_ALERT' | 'SMS_ALERT' | 'QUOTE' | 'EMAIL' | 'SMS';
  name: string;
  content: string;
  variables: string[];
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  currency?: string;
  language?: string;
  date_format?: string;
  country?: string;
  city?: string;
  website?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TicketCategory {
  id: number;
  name: string;
  icon?: string;
  isActive: boolean;
}

export interface TicketSubCategory {
  id: number;
  categoryId: number;
  category_id?: number; // Legacy alias
  name: string;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  slaHours: number;
  isActive: boolean;
}

// === CONFIGURATION MODULE TECH ===

export interface InterventionTypeConfig {
  id: string;
  tenantId?: string;
  code: string; // INSTALLATION, DEPANNAGE, etc.
  label: string;
  description?: string;
  icon?: string;
  color?: string; // Couleur pour le planning
  defaultDuration: number; // En minutes
  baseCost: number; // Coût de base en FCFA
  isActive: boolean;
  isSystem: boolean; // Types système non modifiables
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InterventionNatureConfig {
  id: string;
  tenantId?: string;
  typeId: string; // Lié à InterventionTypeConfig
  code: string; // Installation, Remplacement, etc.
  label: string;
  description?: string;
  requiredFields?: string[]; // Champs obligatoires (IMEI, SIM, etc.)
  checklistTemplate?: InterventionChecklistItem[];
  isActive: boolean;
  isSystem: boolean;
  displayOrder: number;
}

export interface InterventionChecklistItem {
  id: string;
  label: string;
  isRequired: boolean;
  order: number;
}

export interface TechSlaConfig {
  id?: string;
  tenantId?: string;
  // Délais d'intervention par priorité (en heures)
  criticalResponseTime: number;
  highResponseTime: number;
  mediumResponseTime: number;
  lowResponseTime: number;
  // Délais de clôture après intervention
  criticalCloseTime: number;
  highCloseTime: number;
  mediumCloseTime: number;
  lowCloseTime: number;
  // Alertes
  alertBeforeDeadline: number; // Minutes avant deadline pour alerter
  autoEscalation: boolean;
  isCustom?: boolean;
}

export interface DeviceModelConfig {
  id: string;
  tenantId?: string;
  type: 'BOX' | 'SIM' | 'SENSOR' | 'ACCESSORY';
  brand: string;
  model: string;
  protocol?: string;
  description?: string;
  specifications?: Record<string, string>;
  defaultPrice?: number;
  isActive: boolean;
  displayOrder: number;
}

export interface TechAssignmentRule {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  priority: number; // Ordre d'évaluation
  isActive: boolean;
  // Conditions
  conditions: {
    interventionTypes?: string[];
    zones?: string[]; // IDs des zones géographiques
    clientTypes?: string[];
    priority?: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[];
  };
  // Actions
  actions: {
    assignToTechnician?: string; // ID technicien spécifique
    assignBySpecialty?: string; // Spécialité requise
    assignByZone?: boolean; // Assigner au tech le plus proche
    assignByWorkload?: boolean; // Assigner au tech le moins chargé
    notifyTechnician?: boolean;
    notifyManager?: boolean;
  };
}

export interface TechConfig {
  interventionTypes: InterventionTypeConfig[];
  interventionNatures: InterventionNatureConfig[];
  sla: TechSlaConfig;
  deviceModels: DeviceModelConfig[];
  assignmentRules: TechAssignmentRule[];
}

export interface Driver {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  permis?: string;
  permisCategories?: string;
  permisExpiration?: string;
  rfidTag?: string;
  contactUrgence?: string;
  statut: 'Actif' | 'Inactif' | 'En congé';
  tenantId?: string;
  clientId?: string; // Linked to a client if B2B
}

export interface Tech {
  id: string;
  nom: string;
  email?: string;
  telephone?: string;
  societe?: string;
  specialite: string;
  niveau: 'Junior' | 'Confirmé' | 'Expert';
  zone: string;
  statut: 'Actif' | 'Inactif' | 'En attente';
  tenantId?: string;
}

export interface Group {
  id: string;
  tenantId?: string;
  nom: string;
  description?: string;
  statut: 'Actif' | 'Inactif';
  vehicleCount?: number;
  createdAt?: string;
}

export interface Command {
  id: string;
  tenantId?: string;
  vehicleId: string;
  type: 'CUT_ENGINE' | 'RESTORE_ENGINE' | 'OPEN_DOOR' | 'CLOSE_DOOR' | 'REBOOT_DEVICE' | 'GET_POSITION' | 'CUSTOM';
  channel: 'GPRS' | 'SMS';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'EXECUTED' | 'FAILED' | 'TIMEOUT';
  response?: string;
  sentAt: string;
  executedAt?: string;
  createdBy: string;
}

export interface POI {
  id: string;
  tenantId?: string;
  name: string;
  type: 'GAS_STATION' | 'CLIENT' | 'SUPPLIER' | 'RESTAURANT' | 'OTHER';
  address?: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AlertConfig {
  id: string;
  tenantId?: string;
  name: string;
  type:
    | 'SPEEDING'
    | 'GEOFENCE'
    | 'FUEL_THEFT'
    | 'FUEL_LOW'
    | 'IDLE'
    | 'SOS'
    | 'MAINTENANCE'
    | 'BATTERY'
    | 'JAMMING'
    | 'OFFLINE'
    | 'SPEED'
    | 'MOVEMENT'
    | 'OTHER';
  priority: 'low' | 'medium' | 'high' | 'critical' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  conditionValue?: number;
  conditionDuration?: number;
  geofenceId?: string;
  geofenceName?: string;
  geofenceDirection?: 'enter' | 'exit' | 'both';
  vehicleIds?: string[];
  allVehicles?: boolean;
  isScheduled?: boolean;
  scheduleDays?: number[];
  scheduleTimeStart?: string;
  scheduleTimeEnd?: string;
  notifyEmail?: boolean;
  notifySms?: boolean;
  notifyPush?: boolean;
  notifyWeb?: boolean;
  notificationUserIds?: string[];
  customEmails?: string;
  customPhones?: string;
  isActive?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  recipients?: string[];
  channels?: ('EMAIL' | 'SMS' | 'PUSH')[];
  conditions?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceRule {
  id: string;
  tenantId?: string;
  name: string;
  type: 'MILEAGE' | 'TIME' | 'ENGINE_HOURS';
  intervalValue: number; // km, days, or hours
  intervalUnit?: 'KM' | 'DAYS' | 'HOURS';
  vehicleIds?: string[]; // specific vehicles or all
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ScheduleRule {
  id: string;
  tenantId?: string;
  name: string;
  enableTimeRestriction: boolean;
  timeRanges?: { start: string; end: string; days: number[] }[];
  enableDistanceLimit: boolean;
  maxDistancePerDay?: number;
  enableSpeedLimit: boolean;
  maxSpeed?: number;
  enableEngineHoursLimit: boolean;
  maxEngineHoursPerDay?: number;
  vehicleIds?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  enableCustomRestriction?: boolean;
  customRestrictionName?: string;
}

export interface EcoDrivingProfile {
  id: string;
  tenantId?: string;
  name: string;
  targetScore: number;
  maxSpeedLimit: number;
  maxSpeedPenalty: number;
  harshAccelerationSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  harshBrakingSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  maxIdlingDuration: number; // minutes
  status: 'ACTIVE' | 'INACTIVE';
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

export type AutomationTriggerType =
  | 'LEAD_CREATED'
  | 'LEAD_STATUS_CHANGED'
  | 'QUOTE_SENT'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REJECTED'
  | 'INVOICE_CREATED'
  | 'INVOICE_OVERDUE'
  | 'INVOICE_PAID'
  | 'CONTRACT_CREATED'
  | 'CONTRACT_EXPIRING'
  | 'CONTRACT_EXPIRED'
  | 'PAYMENT_RECEIVED'
  | 'TASK_DUE'
  | 'VEHICLE_ALERT';

export type AutomationActionType =
  | 'CREATE_TASK'
  | 'SEND_EMAIL'
  | 'SEND_SMS'
  | 'SEND_TELEGRAM'
  | 'UPDATE_STATUS'
  | 'ASSIGN_TO_USER'
  | 'CREATE_DUNNING'
  | 'WEBHOOK';

export interface AutomationRule {
  id: string;
  name: string;
  triggerType: AutomationTriggerType;
  condition?: {
    field?: string;
    operator?: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
    value?: any;
  } | null;
  action: {
    type: AutomationActionType;
    taskTemplate?: {
      title: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueInDays?: number;
      assignTo?: string;
    };
    emailTemplate?: {
      subject: string;
      html: string;
    };
    smsTemplate?: {
      message: string;
    };
    statusUpdate?: {
      newStatus: string;
    };
    webhookUrl?: string;
    messageTemplateId?: string;
  };
  isActive: boolean;
  runCount?: number;
  lastRunAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
