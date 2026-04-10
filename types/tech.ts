// types/tech.ts — Interventions, stock, devices, technicians, tech config

export type InterventionType = 'INSTALLATION' | 'DEPANNAGE';
export type InterventionNature = 'Installation' | 'Remplacement' | 'Transfert' | 'Retrait' | 'Réinstallation' | 'Contrôle branchements' | 'Recalibrage sonde' | 'Maintenance' | 'Diagnostic' | 'Dépannage' | 'Désinstallation';

export interface Intervention {
  id: string;
  tenantId: string;
  ticketId?: string;
  createdAt: string; // Date de création de la demande (ISO)
  startTime?: string; // Date/Heure de début de l'intervention
  enRouteTime?: string; // Date/Heure de mise en route vers le client
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
  duration: number; // en minutes
  location: string;
  address?: string; // Adresse de l'intervention

  // *** NOUVEAU CHAMP DEMANDÉ ***
  cost?: number; // Montant de l'intervention (sans devise)
  invoiceItems?: { id?: string; description: string; quantity: number; unitPrice: number; price?: number; total?: number }[]; // Détail facturation
  
  // Identifiants Véhicule
  licensePlate?: string; // Plaque Définitive
  tempPlate?: string; // WW (legacy alias)
  wwPlate?: string; // Plaque WW (provisoire)
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
  iccid?: string;   // ID Carte SIM (8933...)
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
  status: 'IN_STOCK' | 'INSTALLED' | 'RMA' | 'RMA_PENDING' | 'SENT_TO_SUPPLIER' | 'REPLACED_BY_SUPPLIER' | 'SCRAPPED' | 'LOST' | 'REMOVED'; // Extended with RMA workflow statuses
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
  location: 'CENTRAL' | 'SIEGE' | 'TECH'; // Localisation physique
  technicianId?: string; // Si location === 'TECH'
  transferStatus?: 'NONE' | 'PENDING_RECEIPT' | 'PENDING_RETURN'; // État du transfert

  
  // Dates
  entryDate?: string;        // Date d'entrée en stock
  installationDate?: string; // Date d'installation
  removalDate?: string;      // Date de sortie/retrait
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
