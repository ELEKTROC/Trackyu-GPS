// types/auth.ts — Authentication, permissions, users

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
}

// Alias pour compatibilité
export type User = SystemUser;

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
