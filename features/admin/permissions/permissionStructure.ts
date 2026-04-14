/**
 * Structure Complète des Permissions TrackYu
 *
 * Définition hiérarchique: Module → Onglet → Champ
 * avec actions disponibles pour chaque niveau
 */

import type { ModulePermission, PermissionAction } from './types';

// Actions standards
const CRUD: PermissionAction[] = ['VIEW', 'CREATE', 'EDIT', 'DELETE'];
const VIEW_ONLY: PermissionAction[] = ['VIEW'];
const FULL: PermissionAction[] = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'IMPORT'];

export const PERMISSION_MODULES: ModulePermission[] = [
  // ============================================
  // TABLEAU DE BORD
  // ============================================
  {
    id: 'dashboard',
    label: 'Tableau de Bord',
    description: "Vue d'ensemble et KPIs",
    icon: 'LayoutDashboard',
    category: 'general',
    globalActions: ['VIEW', 'EXPORT'],
    tabs: [
      {
        id: 'dashboard.overview',
        label: 'Vue Générale',
        actions: VIEW_ONLY,
        fields: [
          { id: 'dashboard.overview.kpi_vehicles', label: 'KPI Véhicules', type: 'number', actions: VIEW_ONLY },
          { id: 'dashboard.overview.kpi_clients', label: 'KPI Clients', type: 'number', actions: VIEW_ONLY },
          {
            id: 'dashboard.overview.kpi_revenue',
            label: 'KPI Revenus',
            type: 'number',
            actions: VIEW_ONLY,
            sensitive: true,
          },
          { id: 'dashboard.overview.kpi_alerts', label: 'KPI Alertes', type: 'number', actions: VIEW_ONLY },
        ],
      },
      {
        id: 'dashboard.charts',
        label: 'Graphiques',
        actions: VIEW_ONLY,
        fields: [
          {
            id: 'dashboard.charts.revenue_trend',
            label: 'Tendance Revenus',
            type: 'number',
            actions: VIEW_ONLY,
            sensitive: true,
          },
          { id: 'dashboard.charts.vehicle_status', label: 'Statut Véhicules', type: 'number', actions: VIEW_ONLY },
          { id: 'dashboard.charts.interventions', label: 'Interventions', type: 'number', actions: VIEW_ONLY },
        ],
      },
    ],
  },

  // ============================================
  // CARTE & TRACKING
  // ============================================
  {
    id: 'map',
    label: 'Carte',
    description: 'Suivi GPS en temps réel',
    icon: 'Map',
    category: 'general',
    globalActions: ['VIEW', 'EXPORT'],
    tabs: [
      {
        id: 'map.realtime',
        label: 'Temps Réel',
        actions: VIEW_ONLY,
        fields: [
          { id: 'map.realtime.position', label: 'Position GPS', type: 'text', actions: VIEW_ONLY },
          { id: 'map.realtime.speed', label: 'Vitesse', type: 'number', actions: VIEW_ONLY },
          { id: 'map.realtime.direction', label: 'Direction', type: 'text', actions: VIEW_ONLY },
          { id: 'map.realtime.ignition', label: 'Contact', type: 'boolean', actions: VIEW_ONLY },
        ],
      },
      {
        id: 'map.history',
        label: 'Historique',
        actions: ['VIEW', 'EXPORT'],
        fields: [
          { id: 'map.history.trajets', label: 'Trajets', type: 'text', actions: ['VIEW', 'EXPORT'] },
          { id: 'map.history.stops', label: 'Arrêts', type: 'text', actions: ['VIEW', 'EXPORT'] },
          { id: 'map.history.events', label: 'Événements', type: 'text', actions: ['VIEW', 'EXPORT'] },
        ],
      },
      {
        id: 'map.geofences',
        label: 'Géofences',
        actions: CRUD,
        fields: [
          { id: 'map.geofences.name', label: 'Nom Zone', type: 'text', actions: CRUD },
          { id: 'map.geofences.type', label: 'Type', type: 'select', actions: CRUD },
          { id: 'map.geofences.coordinates', label: 'Coordonnées', type: 'text', actions: CRUD },
          { id: 'map.geofences.alerts', label: 'Alertes', type: 'boolean', actions: CRUD },
        ],
      },
    ],
  },

  // ============================================
  // VÉHICULES
  // ============================================
  {
    id: 'vehicles',
    label: 'Véhicules',
    description: 'Gestion de la flotte',
    icon: 'Car',
    category: 'fleet',
    globalActions: FULL,
    tabs: [
      {
        id: 'vehicles.general',
        label: 'Informations Générales',
        actions: CRUD,
        fields: [
          { id: 'vehicles.general.immatriculation', label: 'Immatriculation', type: 'text', actions: CRUD },
          { id: 'vehicles.general.marque', label: 'Marque', type: 'text', actions: CRUD },
          { id: 'vehicles.general.modele', label: 'Modèle', type: 'text', actions: CRUD },
          { id: 'vehicles.general.annee', label: 'Année', type: 'number', actions: CRUD },
          { id: 'vehicles.general.couleur', label: 'Couleur', type: 'text', actions: CRUD },
          { id: 'vehicles.general.vin', label: 'VIN/Châssis', type: 'text', actions: CRUD, sensitive: true },
        ],
      },
      {
        id: 'vehicles.device',
        label: 'Boîtier GPS',
        actions: CRUD,
        staffOnly: true,
        fields: [
          { id: 'vehicles.device.imei', label: 'IMEI', type: 'text', actions: CRUD, sensitive: true },
          { id: 'vehicles.device.sim', label: 'Numéro SIM', type: 'text', actions: CRUD, sensitive: true },
          { id: 'vehicles.device.model', label: 'Modèle Boîtier', type: 'select', actions: CRUD },
          { id: 'vehicles.device.installation_date', label: 'Date Installation', type: 'date', actions: CRUD },
          { id: 'vehicles.device.status', label: 'Statut Boîtier', type: 'select', actions: ['VIEW', 'EDIT'] },
        ],
      },
      {
        id: 'vehicles.client',
        label: 'Client & Contrat',
        actions: ['VIEW', 'EDIT'],
        fields: [
          { id: 'vehicles.client.client_id', label: 'Client', type: 'relation', actions: ['VIEW', 'EDIT'] },
          { id: 'vehicles.client.contract_id', label: 'Contrat', type: 'relation', actions: ['VIEW'] },
          { id: 'vehicles.client.subscription', label: 'Abonnement', type: 'text', actions: ['VIEW'] },
          {
            id: 'vehicles.client.monthly_fee',
            label: 'Mensualité',
            type: 'number',
            actions: ['VIEW'],
            sensitive: true,
          },
        ],
      },
      {
        id: 'vehicles.maintenance',
        label: 'Maintenance',
        actions: CRUD,
        fields: [
          { id: 'vehicles.maintenance.last_service', label: 'Dernier Entretien', type: 'date', actions: CRUD },
          { id: 'vehicles.maintenance.next_service', label: 'Prochain Entretien', type: 'date', actions: CRUD },
          { id: 'vehicles.maintenance.km_next', label: 'KM Prochain', type: 'number', actions: CRUD },
          { id: 'vehicles.maintenance.notes', label: 'Notes', type: 'text', actions: CRUD },
        ],
      },
      {
        id: 'vehicles.documents',
        label: 'Documents',
        actions: CRUD,
        fields: [
          { id: 'vehicles.documents.carte_grise', label: 'Carte Grise', type: 'file', actions: CRUD },
          { id: 'vehicles.documents.assurance', label: 'Assurance', type: 'file', actions: CRUD },
          { id: 'vehicles.documents.visite_technique', label: 'Visite Technique', type: 'file', actions: CRUD },
          { id: 'vehicles.documents.photos', label: 'Photos', type: 'file', actions: CRUD },
        ],
      },
      {
        id: 'vehicles.alerts',
        label: 'Alertes',
        actions: CRUD,
        fields: [
          { id: 'vehicles.alerts.speed_limit', label: 'Limite Vitesse', type: 'number', actions: CRUD },
          { id: 'vehicles.alerts.geofence_alerts', label: 'Alertes Géofence', type: 'boolean', actions: CRUD },
          { id: 'vehicles.alerts.ignition_alerts', label: 'Alertes Contact', type: 'boolean', actions: CRUD },
          { id: 'vehicles.alerts.fuel_alerts', label: 'Alertes Carburant', type: 'boolean', actions: CRUD },
        ],
      },
    ],
  },

  // ============================================
  // CHAUFFEURS
  // ============================================
  {
    id: 'drivers',
    label: 'Chauffeurs',
    description: 'Gestion des conducteurs',
    icon: 'UserCircle',
    category: 'fleet',
    globalActions: FULL,
    tabs: [
      {
        id: 'drivers.info',
        label: 'Identité',
        actions: CRUD,
        fields: [
          { id: 'drivers.info.nom', label: 'Nom', type: 'text', actions: CRUD },
          { id: 'drivers.info.prenom', label: 'Prénom', type: 'text', actions: CRUD },
          { id: 'drivers.info.telephone', label: 'Téléphone', type: 'text', actions: CRUD },
          { id: 'drivers.info.email', label: 'Email', type: 'text', actions: CRUD },
          { id: 'drivers.info.cni', label: 'N° CNI', type: 'text', actions: CRUD, sensitive: true },
          { id: 'drivers.info.photo', label: 'Photo', type: 'file', actions: CRUD },
        ],
      },
      {
        id: 'drivers.license',
        label: 'Permis',
        actions: CRUD,
        fields: [
          { id: 'drivers.license.numero', label: 'N° Permis', type: 'text', actions: CRUD, sensitive: true },
          { id: 'drivers.license.categorie', label: 'Catégorie', type: 'select', actions: CRUD },
          { id: 'drivers.license.date_obtention', label: 'Date Obtention', type: 'date', actions: CRUD },
          { id: 'drivers.license.date_expiration', label: 'Date Expiration', type: 'date', actions: CRUD },
          { id: 'drivers.license.document', label: 'Scan Permis', type: 'file', actions: CRUD },
        ],
      },
      {
        id: 'drivers.assignment',
        label: 'Affectation',
        actions: ['VIEW', 'EDIT'],
        fields: [
          {
            id: 'drivers.assignment.vehicle_id',
            label: 'Véhicule Assigné',
            type: 'relation',
            actions: ['VIEW', 'EDIT'],
          },
          { id: 'drivers.assignment.client_id', label: 'Client', type: 'relation', actions: ['VIEW'] },
          {
            id: 'drivers.assignment.date_affectation',
            label: 'Date Affectation',
            type: 'date',
            actions: ['VIEW', 'EDIT'],
          },
        ],
      },
      {
        id: 'drivers.stats',
        label: 'Statistiques',
        actions: VIEW_ONLY,
        fields: [
          { id: 'drivers.stats.km_total', label: 'KM Total', type: 'number', actions: VIEW_ONLY },
          { id: 'drivers.stats.trajets_count', label: 'Nombre Trajets', type: 'number', actions: VIEW_ONLY },
          { id: 'drivers.stats.score_conduite', label: 'Score Conduite', type: 'number', actions: VIEW_ONLY },
          { id: 'drivers.stats.infractions', label: 'Infractions', type: 'number', actions: VIEW_ONLY },
        ],
      },
    ],
  },

  // ============================================
  // CLIENTS
  // ============================================
  {
    id: 'clients',
    label: 'Clients',
    description: 'Gestion des clients',
    icon: 'Building',
    category: 'crm',
    globalActions: FULL,
    tabs: [
      {
        id: 'clients.company',
        label: 'Entreprise',
        actions: CRUD,
        fields: [
          { id: 'clients.company.raison_sociale', label: 'Raison Sociale', type: 'text', actions: CRUD },
          { id: 'clients.company.type', label: 'Type (Société/Particulier)', type: 'select', actions: CRUD },
          { id: 'clients.company.secteur', label: 'Secteur Activité', type: 'select', actions: CRUD },
          { id: 'clients.company.taille', label: 'Taille Flotte', type: 'number', actions: CRUD },
          { id: 'clients.company.ninea', label: 'NINEA', type: 'text', actions: CRUD, sensitive: true },
          { id: 'clients.company.rccm', label: 'RCCM', type: 'text', actions: CRUD, sensitive: true },
        ],
      },
      {
        id: 'clients.contact',
        label: 'Contact',
        actions: CRUD,
        fields: [
          { id: 'clients.contact.nom_contact', label: 'Nom Contact', type: 'text', actions: CRUD },
          { id: 'clients.contact.fonction', label: 'Fonction', type: 'text', actions: CRUD },
          { id: 'clients.contact.telephone', label: 'Téléphone', type: 'text', actions: CRUD },
          { id: 'clients.contact.email', label: 'Email', type: 'text', actions: CRUD },
          { id: 'clients.contact.adresse', label: 'Adresse', type: 'text', actions: CRUD },
        ],
      },
      {
        id: 'clients.billing',
        label: 'Facturation',
        actions: ['VIEW', 'EDIT'],
        fields: [
          { id: 'clients.billing.mode_paiement', label: 'Mode Paiement', type: 'select', actions: ['VIEW', 'EDIT'] },
          { id: 'clients.billing.echeance', label: 'Échéance (jours)', type: 'number', actions: ['VIEW', 'EDIT'] },
          { id: 'clients.billing.rib', label: 'RIB', type: 'text', actions: ['VIEW', 'EDIT'], sensitive: true },
          { id: 'clients.billing.solde', label: 'Solde', type: 'number', actions: VIEW_ONLY, sensitive: true },
        ],
      },
      {
        id: 'clients.vehicles',
        label: 'Véhicules',
        actions: VIEW_ONLY,
        fields: [
          { id: 'clients.vehicles.list', label: 'Liste Véhicules', type: 'relation', actions: VIEW_ONLY },
          { id: 'clients.vehicles.count', label: 'Nombre Véhicules', type: 'number', actions: VIEW_ONLY },
        ],
      },
      {
        id: 'clients.contracts',
        label: 'Contrats',
        actions: ['VIEW', 'CREATE'],
        fields: [
          { id: 'clients.contracts.list', label: 'Liste Contrats', type: 'relation', actions: ['VIEW', 'CREATE'] },
          { id: 'clients.contracts.actif', label: 'Contrat Actif', type: 'relation', actions: VIEW_ONLY },
        ],
      },
      {
        id: 'clients.invoices',
        label: 'Factures',
        actions: VIEW_ONLY,
        fields: [
          { id: 'clients.invoices.list', label: 'Historique Factures', type: 'relation', actions: VIEW_ONLY },
          { id: 'clients.invoices.impayees', label: 'Factures Impayées', type: 'relation', actions: VIEW_ONLY },
          { id: 'clients.invoices.total_du', label: 'Total Dû', type: 'number', actions: VIEW_ONLY, sensitive: true },
        ],
      },
      {
        id: 'clients.access',
        label: 'Accès Plateforme',
        actions: CRUD,
        fields: [
          { id: 'clients.access.login', label: 'Login', type: 'text', actions: CRUD },
          { id: 'clients.access.password_reset', label: 'Reset Mot de Passe', type: 'boolean', actions: ['EDIT'] },
          { id: 'clients.access.active', label: 'Compte Actif', type: 'boolean', actions: ['VIEW', 'EDIT'] },
          { id: 'clients.access.last_login', label: 'Dernière Connexion', type: 'date', actions: VIEW_ONLY },
        ],
      },
    ],
  },

  // ============================================
  // LEADS (PISTES)
  // ============================================
  {
    id: 'leads',
    label: 'Pistes',
    description: 'Prospection commerciale',
    icon: 'Target',
    category: 'crm',
    globalActions: FULL,
    tabs: [
      {
        id: 'leads.info',
        label: 'Information',
        actions: CRUD,
        fields: [
          { id: 'leads.info.entreprise', label: 'Entreprise', type: 'text', actions: CRUD },
          { id: 'leads.info.contact', label: 'Contact', type: 'text', actions: CRUD },
          { id: 'leads.info.telephone', label: 'Téléphone', type: 'text', actions: CRUD },
          { id: 'leads.info.email', label: 'Email', type: 'text', actions: CRUD },
          { id: 'leads.info.source', label: 'Source', type: 'select', actions: CRUD },
        ],
      },
      {
        id: 'leads.qualification',
        label: 'Qualification',
        actions: CRUD,
        fields: [
          { id: 'leads.qualification.statut', label: 'Statut', type: 'select', actions: CRUD },
          { id: 'leads.qualification.score', label: 'Score', type: 'number', actions: CRUD },
          { id: 'leads.qualification.taille_flotte', label: 'Taille Flotte', type: 'number', actions: CRUD },
          { id: 'leads.qualification.budget', label: 'Budget', type: 'number', actions: CRUD, sensitive: true },
          { id: 'leads.qualification.decision_date', label: 'Date Décision', type: 'date', actions: CRUD },
        ],
      },
      {
        id: 'leads.commercial',
        label: 'Suivi Commercial',
        actions: CRUD,
        fields: [
          { id: 'leads.commercial.commercial_id', label: 'Commercial Assigné', type: 'relation', actions: CRUD },
          { id: 'leads.commercial.notes', label: 'Notes', type: 'text', actions: CRUD },
          { id: 'leads.commercial.next_action', label: 'Prochaine Action', type: 'text', actions: CRUD },
          { id: 'leads.commercial.next_date', label: 'Date Relance', type: 'date', actions: CRUD },
        ],
      },
    ],
  },

  // ============================================
  // CONTRATS
  // ============================================
  {
    id: 'contracts',
    label: 'Contrats',
    description: 'Gestion des contrats',
    icon: 'FileSignature',
    category: 'crm',
    globalActions: FULL,
    tabs: [
      {
        id: 'contracts.general',
        label: 'Général',
        actions: CRUD,
        fields: [
          { id: 'contracts.general.numero', label: 'N° Contrat', type: 'text', actions: ['VIEW', 'CREATE'] },
          { id: 'contracts.general.client_id', label: 'Client', type: 'relation', actions: CRUD },
          { id: 'contracts.general.type', label: 'Type Contrat', type: 'select', actions: CRUD },
          { id: 'contracts.general.date_debut', label: 'Date Début', type: 'date', actions: CRUD },
          { id: 'contracts.general.date_fin', label: 'Date Fin', type: 'date', actions: CRUD },
          { id: 'contracts.general.statut', label: 'Statut', type: 'select', actions: CRUD },
        ],
      },
      {
        id: 'contracts.terms',
        label: 'Conditions',
        actions: ['VIEW', 'EDIT'],
        fields: [
          {
            id: 'contracts.terms.mensualite',
            label: 'Mensualité',
            type: 'number',
            actions: ['VIEW', 'EDIT'],
            sensitive: true,
          },
          { id: 'contracts.terms.engagement', label: 'Engagement (mois)', type: 'number', actions: ['VIEW', 'EDIT'] },
          {
            id: 'contracts.terms.caution',
            label: 'Caution',
            type: 'number',
            actions: ['VIEW', 'EDIT'],
            sensitive: true,
          },
          {
            id: 'contracts.terms.frais_installation',
            label: 'Frais Installation',
            type: 'number',
            actions: ['VIEW', 'EDIT'],
            sensitive: true,
          },
        ],
      },
      {
        id: 'contracts.vehicles',
        label: 'Véhicules Couverts',
        actions: CRUD,
        fields: [
          { id: 'contracts.vehicles.list', label: 'Liste Véhicules', type: 'relation', actions: CRUD },
          { id: 'contracts.vehicles.count', label: 'Nombre Véhicules', type: 'number', actions: VIEW_ONLY },
        ],
      },
      {
        id: 'contracts.documents',
        label: 'Documents',
        actions: CRUD,
        fields: [
          { id: 'contracts.documents.contrat_signe', label: 'Contrat Signé', type: 'file', actions: CRUD },
          { id: 'contracts.documents.annexes', label: 'Annexes', type: 'file', actions: CRUD },
        ],
      },
    ],
  },

  // ============================================
  // FACTURES
  // ============================================
  {
    id: 'invoices',
    label: 'Factures',
    description: 'Facturation et paiements',
    icon: 'Receipt',
    category: 'finance',
    globalActions: FULL,
    tabs: [
      {
        id: 'invoices.info',
        label: 'Informations',
        actions: CRUD,
        fields: [
          { id: 'invoices.info.numero', label: 'N° Facture', type: 'text', actions: ['VIEW', 'CREATE'] },
          { id: 'invoices.info.client_id', label: 'Client', type: 'relation', actions: CRUD },
          { id: 'invoices.info.date_emission', label: 'Date Émission', type: 'date', actions: CRUD },
          { id: 'invoices.info.date_echeance', label: 'Date Échéance', type: 'date', actions: CRUD },
          { id: 'invoices.info.statut', label: 'Statut', type: 'select', actions: CRUD },
        ],
      },
      {
        id: 'invoices.amounts',
        label: 'Montants',
        actions: ['VIEW', 'EDIT'],
        fields: [
          {
            id: 'invoices.amounts.ht',
            label: 'Montant HT',
            type: 'number',
            actions: ['VIEW', 'EDIT'],
            sensitive: true,
          },
          { id: 'invoices.amounts.tva', label: 'TVA', type: 'number', actions: ['VIEW', 'EDIT'], sensitive: true },
          { id: 'invoices.amounts.ttc', label: 'Montant TTC', type: 'number', actions: VIEW_ONLY, sensitive: true },
          { id: 'invoices.amounts.paye', label: 'Montant Payé', type: 'number', actions: VIEW_ONLY, sensitive: true },
          { id: 'invoices.amounts.reste', label: 'Reste à Payer', type: 'number', actions: VIEW_ONLY, sensitive: true },
        ],
      },
      {
        id: 'invoices.lines',
        label: 'Lignes',
        actions: CRUD,
        fields: [{ id: 'invoices.lines.items', label: 'Lignes de Facture', type: 'relation', actions: CRUD }],
      },
      {
        id: 'invoices.payments',
        label: 'Paiements',
        actions: ['VIEW', 'CREATE'],
        fields: [
          { id: 'invoices.payments.list', label: 'Liste Paiements', type: 'relation', actions: ['VIEW', 'CREATE'] },
        ],
      },
    ],
  },

  // ============================================
  // PAIEMENTS
  // ============================================
  {
    id: 'payments',
    label: 'Paiements',
    description: 'Enregistrement des paiements',
    icon: 'CreditCard',
    category: 'finance',
    globalActions: ['VIEW', 'CREATE', 'EXPORT'],
    tabs: [
      {
        id: 'payments.info',
        label: 'Informations',
        actions: ['VIEW', 'CREATE'],
        fields: [
          { id: 'payments.info.reference', label: 'Référence', type: 'text', actions: ['VIEW', 'CREATE'] },
          { id: 'payments.info.invoice_id', label: 'Facture', type: 'relation', actions: ['VIEW', 'CREATE'] },
          { id: 'payments.info.client_id', label: 'Client', type: 'relation', actions: ['VIEW'] },
          { id: 'payments.info.date', label: 'Date Paiement', type: 'date', actions: ['VIEW', 'CREATE'] },
          {
            id: 'payments.info.montant',
            label: 'Montant',
            type: 'number',
            actions: ['VIEW', 'CREATE'],
            sensitive: true,
          },
          { id: 'payments.info.mode', label: 'Mode Paiement', type: 'select', actions: ['VIEW', 'CREATE'] },
        ],
      },
    ],
  },

  // ============================================
  // INTERVENTIONS
  // ============================================
  {
    id: 'interventions',
    label: 'Interventions',
    description: 'Interventions techniques',
    icon: 'Wrench',
    category: 'tech',
    globalActions: FULL,
    tabs: [
      {
        id: 'interventions.info',
        label: 'Informations',
        actions: CRUD,
        fields: [
          { id: 'interventions.info.numero', label: 'N° Intervention', type: 'text', actions: ['VIEW', 'CREATE'] },
          { id: 'interventions.info.type', label: 'Type', type: 'select', actions: CRUD },
          { id: 'interventions.info.client_id', label: 'Client', type: 'relation', actions: CRUD },
          { id: 'interventions.info.vehicle_id', label: 'Véhicule', type: 'relation', actions: CRUD },
          { id: 'interventions.info.priority', label: 'Priorité', type: 'select', actions: CRUD },
        ],
      },
      {
        id: 'interventions.planning',
        label: 'Planification',
        actions: CRUD,
        fields: [
          { id: 'interventions.planning.date_prevue', label: 'Date Prévue', type: 'date', actions: CRUD },
          { id: 'interventions.planning.technicien_id', label: 'Technicien', type: 'relation', actions: CRUD },
          { id: 'interventions.planning.duree_estimee', label: 'Durée Estimée', type: 'number', actions: CRUD },
          { id: 'interventions.planning.lieu', label: 'Lieu', type: 'text', actions: CRUD },
        ],
      },
      {
        id: 'interventions.execution',
        label: 'Exécution',
        actions: ['VIEW', 'EDIT'],
        fields: [
          { id: 'interventions.execution.statut', label: 'Statut', type: 'select', actions: ['VIEW', 'EDIT'] },
          { id: 'interventions.execution.date_debut', label: 'Date Début', type: 'date', actions: ['VIEW', 'EDIT'] },
          { id: 'interventions.execution.date_fin', label: 'Date Fin', type: 'date', actions: ['VIEW', 'EDIT'] },
          { id: 'interventions.execution.rapport', label: 'Rapport', type: 'text', actions: ['VIEW', 'EDIT'] },
          { id: 'interventions.execution.photos', label: 'Photos', type: 'file', actions: ['VIEW', 'EDIT'] },
        ],
      },
      {
        id: 'interventions.stock',
        label: 'Pièces Utilisées',
        actions: ['VIEW', 'EDIT'],
        fields: [
          { id: 'interventions.stock.pieces', label: 'Pièces', type: 'relation', actions: ['VIEW', 'EDIT'] },
          {
            id: 'interventions.stock.boitier_pose',
            label: 'Boîtier Posé',
            type: 'relation',
            actions: ['VIEW', 'EDIT'],
          },
          {
            id: 'interventions.stock.boitier_depose',
            label: 'Boîtier Déposé',
            type: 'relation',
            actions: ['VIEW', 'EDIT'],
          },
        ],
      },
      {
        id: 'interventions.signature',
        label: 'Signature',
        actions: ['VIEW', 'EDIT'],
        fields: [
          {
            id: 'interventions.signature.signature',
            label: 'Signature Client',
            type: 'file',
            actions: ['VIEW', 'EDIT'],
          },
          {
            id: 'interventions.signature.nom_signataire',
            label: 'Nom Signataire',
            type: 'text',
            actions: ['VIEW', 'EDIT'],
          },
          { id: 'interventions.signature.date_signature', label: 'Date Signature', type: 'date', actions: ['VIEW'] },
        ],
      },
    ],
  },

  // ============================================
  // STOCK
  // ============================================
  {
    id: 'stock',
    label: 'Stock',
    description: 'Gestion du stock',
    icon: 'Package',
    category: 'tech',
    globalActions: FULL,
    tabs: [
      {
        id: 'stock.inventory',
        label: 'Inventaire',
        actions: CRUD,
        fields: [
          { id: 'stock.inventory.reference', label: 'Référence', type: 'text', actions: CRUD },
          { id: 'stock.inventory.designation', label: 'Désignation', type: 'text', actions: CRUD },
          { id: 'stock.inventory.categorie', label: 'Catégorie', type: 'select', actions: CRUD },
          { id: 'stock.inventory.quantite', label: 'Quantité', type: 'number', actions: CRUD },
          { id: 'stock.inventory.seuil_alerte', label: 'Seuil Alerte', type: 'number', actions: CRUD },
        ],
      },
      {
        id: 'stock.pricing',
        label: 'Tarification',
        actions: ['VIEW', 'EDIT'],
        fields: [
          {
            id: 'stock.pricing.prix_achat',
            label: 'Prix Achat',
            type: 'number',
            actions: ['VIEW', 'EDIT'],
            sensitive: true,
          },
          {
            id: 'stock.pricing.prix_vente',
            label: 'Prix Vente',
            type: 'number',
            actions: ['VIEW', 'EDIT'],
            sensitive: true,
          },
          { id: 'stock.pricing.marge', label: 'Marge', type: 'number', actions: VIEW_ONLY, sensitive: true },
        ],
      },
      {
        id: 'stock.movements',
        label: 'Mouvements',
        actions: ['VIEW', 'CREATE'],
        fields: [
          { id: 'stock.movements.entries', label: 'Entrées', type: 'relation', actions: ['VIEW', 'CREATE'] },
          { id: 'stock.movements.exits', label: 'Sorties', type: 'relation', actions: ['VIEW', 'CREATE'] },
          { id: 'stock.movements.transfers', label: 'Transferts', type: 'relation', actions: ['VIEW', 'CREATE'] },
        ],
      },
    ],
  },

  // ============================================
  // TICKETS SUPPORT
  // ============================================
  {
    id: 'tickets',
    label: 'Tickets',
    description: 'Support client',
    icon: 'LifeBuoy',
    category: 'support',
    globalActions: FULL,
    tabs: [
      {
        id: 'tickets.info',
        label: 'Informations',
        actions: CRUD,
        fields: [
          { id: 'tickets.info.numero', label: 'N° Ticket', type: 'text', actions: ['VIEW', 'CREATE'] },
          { id: 'tickets.info.sujet', label: 'Sujet', type: 'text', actions: CRUD },
          { id: 'tickets.info.client_id', label: 'Client', type: 'relation', actions: CRUD },
          { id: 'tickets.info.categorie', label: 'Catégorie', type: 'select', actions: CRUD },
          { id: 'tickets.info.priorite', label: 'Priorité', type: 'select', actions: CRUD },
        ],
      },
      {
        id: 'tickets.treatment',
        label: 'Traitement',
        actions: ['VIEW', 'EDIT'],
        fields: [
          { id: 'tickets.treatment.statut', label: 'Statut', type: 'select', actions: ['VIEW', 'EDIT'] },
          { id: 'tickets.treatment.assignee_id', label: 'Assigné à', type: 'relation', actions: ['VIEW', 'EDIT'] },
          {
            id: 'tickets.treatment.date_resolution',
            label: 'Date Résolution',
            type: 'date',
            actions: ['VIEW', 'EDIT'],
          },
        ],
      },
      {
        id: 'tickets.conversation',
        label: 'Conversation',
        actions: ['VIEW', 'CREATE'],
        fields: [
          { id: 'tickets.conversation.messages', label: 'Messages', type: 'relation', actions: ['VIEW', 'CREATE'] },
        ],
      },
    ],
  },

  // ============================================
  // RAPPORTS
  // ============================================
  {
    id: 'reports',
    label: 'Rapports',
    description: 'Génération de rapports',
    icon: 'BarChart3',
    category: 'general',
    globalActions: ['VIEW', 'CREATE', 'EXPORT'],
    tabs: [
      {
        id: 'reports.fleet',
        label: 'Rapports Flotte',
        actions: ['VIEW', 'CREATE', 'EXPORT'],
        fields: [
          { id: 'reports.fleet.trajets', label: 'Rapport Trajets', type: 'text', actions: ['VIEW', 'EXPORT'] },
          {
            id: 'reports.fleet.consommation',
            label: 'Rapport Consommation',
            type: 'text',
            actions: ['VIEW', 'EXPORT'],
          },
          { id: 'reports.fleet.alertes', label: 'Rapport Alertes', type: 'text', actions: ['VIEW', 'EXPORT'] },
        ],
      },
      {
        id: 'reports.finance',
        label: 'Rapports Financiers',
        actions: ['VIEW', 'EXPORT'],
        fields: [
          {
            id: 'reports.finance.ca',
            label: "Chiffre d'Affaires",
            type: 'text',
            actions: ['VIEW', 'EXPORT'],
            sensitive: true,
          },
          {
            id: 'reports.finance.creances',
            label: 'Créances',
            type: 'text',
            actions: ['VIEW', 'EXPORT'],
            sensitive: true,
          },
          { id: 'reports.finance.mrr', label: 'MRR', type: 'text', actions: ['VIEW', 'EXPORT'], sensitive: true },
        ],
      },
      {
        id: 'reports.activity',
        label: 'Rapports Activité',
        actions: ['VIEW', 'EXPORT'],
        fields: [
          {
            id: 'reports.activity.interventions',
            label: 'Rapport Interventions',
            type: 'text',
            actions: ['VIEW', 'EXPORT'],
          },
          {
            id: 'reports.activity.installations',
            label: 'Rapport Installations',
            type: 'text',
            actions: ['VIEW', 'EXPORT'],
          },
        ],
      },
    ],
  },

  // ============================================
  // ADMINISTRATION
  // ============================================
  {
    id: 'admin',
    label: 'Administration',
    description: 'Administration système',
    icon: 'Settings',
    category: 'admin',
    globalActions: FULL,
    tabs: [
      {
        id: 'admin.users',
        label: 'Utilisateurs',
        actions: CRUD,
        fields: [
          { id: 'admin.users.list', label: 'Liste Utilisateurs', type: 'relation', actions: CRUD },
          { id: 'admin.users.invite', label: 'Inviter Utilisateur', type: 'boolean', actions: ['CREATE'] },
          { id: 'admin.users.reset_password', label: 'Reset Mot de Passe', type: 'boolean', actions: ['EDIT'] },
        ],
      },
      {
        id: 'admin.roles',
        label: 'Rôles & Permissions',
        actions: CRUD,
        fields: [
          { id: 'admin.roles.list', label: 'Liste Rôles', type: 'relation', actions: CRUD },
          { id: 'admin.roles.permissions', label: 'Permissions', type: 'relation', actions: CRUD },
        ],
      },
      {
        id: 'admin.resellers',
        label: 'Revendeurs',
        actions: CRUD,
        fields: [
          { id: 'admin.resellers.list', label: 'Liste Revendeurs', type: 'relation', actions: CRUD },
          { id: 'admin.resellers.quotas', label: 'Quotas', type: 'number', actions: CRUD },
        ],
      },
      {
        id: 'admin.settings',
        label: 'Paramètres',
        actions: ['VIEW', 'EDIT'],
        fields: [
          { id: 'admin.settings.general', label: 'Paramètres Généraux', type: 'text', actions: ['VIEW', 'EDIT'] },
          { id: 'admin.settings.branding', label: 'Marque Blanche', type: 'text', actions: ['VIEW', 'EDIT'] },
          { id: 'admin.settings.integrations', label: 'Intégrations', type: 'text', actions: ['VIEW', 'EDIT'] },
        ],
      },
      {
        id: 'admin.logs',
        label: 'Logs Système',
        actions: VIEW_ONLY,
        fields: [
          { id: 'admin.logs.audit', label: 'Logs Audit', type: 'text', actions: VIEW_ONLY },
          { id: 'admin.logs.errors', label: 'Logs Erreurs', type: 'text', actions: VIEW_ONLY },
        ],
      },
    ],
  },

  // ============================================
  // ALERTES
  // ============================================
  {
    id: 'alerts',
    label: 'Alertes',
    description: 'Gestion des alertes',
    icon: 'Bell',
    category: 'general',
    globalActions: ['VIEW', 'EDIT', 'DELETE'],
    tabs: [
      {
        id: 'alerts.list',
        label: 'Liste Alertes',
        actions: ['VIEW', 'EDIT', 'DELETE'],
        fields: [
          { id: 'alerts.list.all', label: 'Toutes les Alertes', type: 'relation', actions: ['VIEW', 'DELETE'] },
          { id: 'alerts.list.unread', label: 'Non Lues', type: 'relation', actions: ['VIEW', 'EDIT'] },
        ],
      },
      {
        id: 'alerts.config',
        label: 'Configuration',
        actions: ['VIEW', 'EDIT'],
        fields: [
          { id: 'alerts.config.rules', label: "Règles d'Alerte", type: 'relation', actions: ['VIEW', 'EDIT'] },
          { id: 'alerts.config.notifications', label: 'Notifications', type: 'boolean', actions: ['VIEW', 'EDIT'] },
        ],
      },
    ],
  },
];

// Catégories pour le groupement
export const PERMISSION_CATEGORIES = [
  { id: 'general', label: 'Accès Général', icon: 'LayoutDashboard', color: 'blue' },
  { id: 'fleet', label: 'Flotte', icon: 'Car', color: 'green' },
  { id: 'crm', label: 'CRM & Ventes', icon: 'Users', color: 'purple' },
  { id: 'finance', label: 'Finance', icon: 'DollarSign', color: 'amber' },
  { id: 'tech', label: 'Technique', icon: 'Wrench', color: 'orange' },
  { id: 'support', label: 'Support', icon: 'LifeBuoy', color: 'cyan' },
  { id: 'admin', label: 'Administration', icon: 'Settings', color: 'red' },
];

// Actions avec leurs labels
export const PERMISSION_ACTIONS: Record<string, { label: string; icon: string; color: string }> = {
  VIEW: { label: 'Voir', icon: 'Eye', color: 'blue' },
  CREATE: { label: 'Créer', icon: 'Plus', color: 'green' },
  EDIT: { label: 'Modifier', icon: 'Edit2', color: 'amber' },
  DELETE: { label: 'Supprimer', icon: 'Trash2', color: 'red' },
  EXPORT: { label: 'Exporter', icon: 'Download', color: 'purple' },
  IMPORT: { label: 'Importer', icon: 'Upload', color: 'cyan' },
};

// Fonction utilitaire pour obtenir un module par ID
export const getModuleById = (moduleId: string) => PERMISSION_MODULES.find((m) => m.id === moduleId);

// Fonction utilitaire pour obtenir un onglet
export const getTabById = (moduleId: string, tabId: string) => {
  const module = getModuleById(moduleId);
  return module?.tabs.find((t) => t.id === tabId);
};

// Fonction utilitaire pour obtenir un champ
export const getFieldById = (moduleId: string, tabId: string, fieldId: string) => {
  const tab = getTabById(moduleId, tabId);
  return tab?.fields.find((f) => f.id === fieldId);
};

// ============================================
// REGISTRE DES MENUS SIDEBAR
// Source unique de vérité pour la navigation
// ============================================

export type SidebarGroup = 'operations' | 'business' | 'technique' | 'support' | 'admin';

export interface SidebarMenuItem {
  id: string; // Correspond à View enum
  label: string; // Label affiché
  mobileLabel?: string; // Label court pour bottom nav (sinon label tronqué)
  icon: string; // Nom de l'icône Lucide
  moduleId?: string; // ID du module de permissions (optionnel si toujours visible)
  permission?: string; // Permission requise (générée depuis moduleId si non spécifiée)
  order: number; // Ordre d'affichage dans le groupe
  alwaysVisible?: boolean; // true = visible sans permission
  hiddenForRoles?: string[]; // Masqué pour ces rôles spécifiques
}

export interface SidebarMenuGroup {
  id: SidebarGroup;
  title: string;
  order: number;
  items: SidebarMenuItem[];
}

/**
 * SIDEBAR_MENU - Registre centralisé des menus
 *
 * Pour ajouter un nouveau menu :
 * 1. Ajouter le module dans PERMISSION_MODULES ci-dessus (si contrôle d'accès requis)
 * 2. Ajouter l'entrée ici avec moduleId correspondant
 * 3. C'est tout ! Le Sidebar se mettra à jour automatiquement
 */
export const SIDEBAR_MENU: SidebarMenuGroup[] = [
  {
    id: 'operations',
    title: 'Opérations',
    order: 1,
    items: [
      {
        id: 'DASHBOARD',
        label: 'Tableau de bord',
        mobileLabel: 'Accueil',
        icon: 'LayoutDashboard',
        moduleId: 'dashboard',
        permission: 'VIEW_DASHBOARD',
        order: 1,
      },
      {
        id: 'MAP',
        label: 'Carte en direct',
        mobileLabel: 'Carte',
        icon: 'Map',
        moduleId: 'map',
        permission: 'VIEW_MAP',
        order: 2,
        hiddenForRoles: ['TECH'],
      },
      {
        id: 'FLEET',
        label: 'Véhicules',
        mobileLabel: 'Flotte',
        icon: 'Truck',
        moduleId: 'vehicles',
        permission: 'VIEW_FLEET',
        order: 3,
        hiddenForRoles: ['TECH'],
      },
      {
        id: 'AGENDA',
        label: 'Agenda',
        icon: 'Calendar',
        alwaysVisible: true,
        order: 4,
        hiddenForRoles: ['CLIENT', 'SOUS_COMPTE', 'SUB_ACCOUNT'],
      },
      {
        id: 'REPORTS',
        label: 'Rapports',
        mobileLabel: 'Rapports',
        icon: 'FileText',
        moduleId: 'reports',
        permission: 'VIEW_REPORTS',
        order: 5,
      },
    ],
  },
  {
    id: 'business',
    title: 'Business',
    order: 2,
    items: [
      {
        id: 'PRESALES',
        label: 'Prévente',
        mobileLabel: 'Prévente',
        icon: 'Briefcase',
        moduleId: 'leads',
        permission: 'VIEW_CRM',
        order: 1,
        hiddenForRoles: ['TECH', 'CLIENT', 'SOUS_COMPTE', 'SUB_ACCOUNT'],
      },
      {
        id: 'SALES',
        label: 'Vente',
        mobileLabel: 'Ventes',
        icon: 'ShoppingCart',
        moduleId: 'clients',
        permission: 'MANAGE_CLIENTS',
        order: 2,
        hiddenForRoles: ['TECH', 'CLIENT', 'SOUS_COMPTE', 'SUB_ACCOUNT'],
      },
      {
        id: 'ACCOUNTING',
        label: 'Comptabilité',
        mobileLabel: 'Compta',
        icon: 'Calculator',
        moduleId: 'payments',
        permission: 'VIEW_FINANCE',
        order: 3,
        hiddenForRoles: ['TECH', 'CLIENT', 'SOUS_COMPTE', 'SUB_ACCOUNT'],
      },
    ],
  },
  {
    id: 'technique',
    title: 'Technique',
    order: 3,
    items: [
      {
        id: 'TECH',
        label: 'Interventions',
        mobileLabel: 'Tech',
        icon: 'Wrench',
        moduleId: 'interventions',
        permission: 'VIEW_TECH',
        order: 1,
      },
      {
        id: 'MONITORING',
        label: 'Monitoring',
        icon: 'Activity',
        moduleId: 'interventions',
        permission: 'VIEW_TECH',
        order: 2,
        hiddenForRoles: ['TECH'],
      },
      {
        id: 'STOCK',
        label: 'Matériel & Stock',
        mobileLabel: 'Stock',
        icon: 'Package',
        moduleId: 'stock',
        permission: 'MANAGE_STOCK',
        order: 3,
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    order: 4,
    items: [
      {
        id: 'SUPPORT',
        label: 'Tickets',
        mobileLabel: 'Tickets',
        icon: 'Headset',
        moduleId: 'tickets',
        permission: 'VIEW_SUPPORT',
        order: 1,
        hiddenForRoles: ['TECH', 'CLIENT', 'SOUS_COMPTE', 'SUB_ACCOUNT'],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    order: 5,
    items: [
      {
        id: 'ADMIN',
        label: 'Administration',
        icon: 'ShieldCheck',
        moduleId: 'admin',
        permission: 'VIEW_ADMIN',
        order: 1,
      },
      { id: 'SETTINGS', label: 'Paramètres', icon: 'Settings', alwaysVisible: true, order: 2 },
    ],
  },
];

/**
 * MOBILE_TAB_PROFILES — Configuration du bottom nav par rôle
 *
 * tabs       : onglets affichés dans la barre du bas (max 5)
 * defaultView: écran de démarrage après login
 * hiddenTabs : menus complètement masqués sur mobile (ni bottom nav, ni Plus)
 * showMore   : afficher le bouton "Plus" (défaut true)
 */
export interface MobileTabProfile {
  roles: string[];
  tabs: string[];
  defaultView: string;
  hiddenTabs?: string[];
  showMore?: boolean;
}

export const MOBILE_TAB_PROFILES: MobileTabProfile[] = [
  // ---------- Clients ----------
  {
    roles: ['CLIENT'],
    tabs: ['FLEET', 'MAP', 'DASHBOARD', 'REPORTS', 'SETTINGS'],
    defaultView: 'FLEET',
  },
  {
    roles: ['SOUS_COMPTE', 'SUB_ACCOUNT'],
    tabs: ['FLEET', 'MAP', 'DASHBOARD', 'REPORTS', 'SETTINGS'],
    defaultView: 'FLEET',
  },
  // ---------- Staff terrain ----------
  {
    roles: ['TECH'],
    tabs: ['TECH', 'AGENDA', 'SETTINGS'],
    defaultView: 'AGENDA',
    hiddenTabs: ['FLEET', 'DASHBOARD', 'MONITORING', 'SUPPORT', 'STOCK', 'REPORTS'],
    showMore: false,
  },
  {
    roles: ['AGENT_TRACKING'],
    tabs: ['DASHBOARD', 'FLEET', 'AGENDA', 'TECH', 'SUPPORT'],
    defaultView: 'DASHBOARD',
  },
  // ---------- Staff bureau ----------
  {
    roles: ['COMMERCIAL'],
    tabs: ['PRESALES', 'SALES', 'AGENDA', 'FLEET', 'SUPPORT'],
    defaultView: 'AGENDA',
  },
  {
    roles: ['SALES'],
    tabs: ['PRESALES', 'SALES', 'AGENDA', 'FLEET', 'SUPPORT'],
    defaultView: 'AGENDA',
  },
  {
    roles: ['COMPTABLE'],
    tabs: ['ACCOUNTING', 'AGENDA', 'FLEET', 'TECH', 'SUPPORT'],
    defaultView: 'ACCOUNTING',
  },
  {
    roles: ['SUPPORT_AGENT'],
    tabs: ['SUPPORT', 'FLEET', 'SALES', 'AGENDA', 'SETTINGS'],
    defaultView: 'SUPPORT',
  },
  {
    roles: ['MANAGER'],
    tabs: ['DASHBOARD', 'FLEET', 'SUPPORT', 'AGENDA', 'SALES'],
    defaultView: 'DASHBOARD',
  },
  // ---------- Admins ----------
  {
    roles: ['ADMIN', 'RESELLER_ADMIN'],
    tabs: ['DASHBOARD', 'FLEET', 'ADMIN', 'SUPPORT', 'SETTINGS'],
    defaultView: 'DASHBOARD',
  },
  {
    roles: ['SUPERADMIN'],
    tabs: ['DASHBOARD', 'FLEET', 'SALES', 'SUPPORT', 'AGENDA'],
    defaultView: 'DASHBOARD',
  },
];

// Onglets par défaut si aucun profil ne matche
export const MOBILE_DEFAULT_TABS = ['DASHBOARD', 'MAP', 'FLEET', 'TECH'];

/** Retourne le profil mobile pour un rôle donné */
export function getMobileProfileForRole(role: string): MobileTabProfile | undefined {
  const normalized = role?.toUpperCase().replace(/_/g, '');
  return MOBILE_TAB_PROFILES.find((p) => p.roles.some((r) => r.toUpperCase().replace(/_/g, '') === normalized));
}

/** Retourne la vue de démarrage pour un rôle donné */
export function getDefaultViewForRole(role: string): string {
  return getMobileProfileForRole(role)?.defaultView ?? 'DASHBOARD';
}

/**
 * Retourne tous les items du menu aplatis (toutes catégories confondues), triés par groupe puis order.
 */
export const getAllMenuItems = (): (SidebarMenuItem & { groupTitle: string })[] => {
  return getSortedSidebarMenu().flatMap((group) => group.items.map((item) => ({ ...item, groupTitle: group.title })));
};

// Helper pour obtenir la permission requise pour un menu
export const getMenuPermission = (menuId: string): string | null => {
  for (const group of SIDEBAR_MENU) {
    const item = group.items.find((i) => i.id === menuId);
    if (item) {
      if (item.alwaysVisible) return null;
      return item.permission || null;
    }
  }
  return null;
};

// Helper pour obtenir tous les menus triés
export const getSortedSidebarMenu = (): SidebarMenuGroup[] => {
  return [...SIDEBAR_MENU]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => a.order - b.order),
    }));
};
