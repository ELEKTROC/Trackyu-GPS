import { Vehicle, VehicleStatus, Zone, CatalogItem } from './types';
import { 
  BarChart3, Map, Truck, Fuel, AlertTriangle, 
  Clock, Settings
} from 'lucide-react';

// Fonction utilitaire pour générer des données réalistes
const generateVehicles = (count: number): Vehicle[] => {
  const vehicles: Vehicle[] = [];
  
  // Modèles de véhicules réels
  const heavyTrucks = ['Volvo FH16', 'Scania R500', 'Mercedes Actros', 'Renault T-High', 'DAF XG+'];
  const lightVehicles = ['Mercedes Sprinter', 'Ford Transit', 'Renault Master', 'Peugeot Boxer'];
  
  // Clients fictifs
  const clients = [
    'Amazon Logistics', 
    'DHL Express', 
    'FedEx Corp', 
    'Maersk Line', 
    'Uber Freight'
  ];

  // Villes pour trajets
  const cities = ['Paris', 'Lyon', 'Marseille', 'Lille', 'Bordeaux', 'Nantes', 'Strasbourg', 'Toulouse', 'Nice', 'Rennes'];

  const statuses = [VehicleStatus.MOVING, VehicleStatus.MOVING, VehicleStatus.MOVING, VehicleStatus.IDLE, VehicleStatus.STOPPED];
  
  // Coordonnées approximatives de la France/Europe de l'Ouest
  const baseLat = 46.603354;
  const baseLng = 1.888334;

  for (let i = 0; i < count; i++) {
    const isTruck = Math.random() > 0.3; // 70% de camions
    const typeList = isTruck ? heavyTrucks : lightVehicles;
    const typeName = typeList[Math.floor(Math.random() * typeList.length)];
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const client = clients[Math.floor(Math.random() * clients.length)];
    
    // Dispersion géographique
    const latSpread = (Math.random() - 0.5) * 10;
    const lngSpread = (Math.random() - 0.5) * 12;

    // Trajets
    const depCity = cities[Math.floor(Math.random() * cities.length)];
    let arrCity = cities[Math.floor(Math.random() * cities.length)];
    while(arrCity === depCity) arrCity = cities[Math.floor(Math.random() * cities.length)];

    // Horaires
    const now = new Date();
    const depTime = new Date(now.getTime() - Math.random() * 4 * 60 * 60 * 1000); // Départ il y a 0-4h
    const arrTime = new Date(now.getTime() + Math.random() * 4 * 60 * 60 * 1000); // Arrivée dans 0-4h
    
    // Données Carburant
    const tankCapacity = isTruck ? 600 : 80;
    const fuelLevelPercent = Math.floor(Math.random() * 100);
    const fuelQuantity = Math.round((fuelLevelPercent / 100) * tankCapacity);
    
    // Événements carburant rares
    const hasRefuel = Math.random() > 0.85;
    const hasLoss = Math.random() > 0.95;
    const hasSuspect = Math.random() > 0.98;

    // Assign tenantId
    const tenantId = Math.random() > 0.9 ? 'tenant_partner_A' : 'tenant_default';

    vehicles.push({
      id: `${isTruck ? 'TRK' : 'VUL'}-${1000 + i}`,
      subscriptionCode: `${isTruck ? 'TRK' : 'VUL'}-${1000 + i}`,
      tenantId: tenantId,
      name: `${typeName} #${i + 1}`,
      client: client,
      driver: `Chauffeur ${i + 1}`,
      status: status,
      location: { 
        lat: baseLat + latSpread, 
        lng: baseLng + lngSpread 
      },
      speed: status === VehicleStatus.MOVING ? Math.floor(Math.random() * 60) + 30 : 0,
      maxSpeed: Math.floor(Math.random() * 30) + 90,
      fuelLevel: fuelLevelPercent,
      lastUpdated: new Date(),
      destination: arrCity,
      arrivalLocation: arrCity,
      departureLocation: depCity,
      departureTime: depTime.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
      arrivalTime: arrTime.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
      mileage: Math.floor(Math.random() * 200000) + 5000,
      dailyMileage: Math.floor(Math.random() * 600),
      violationsCount: Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0,
      driverScore: Math.floor(Math.random() * 30) + 70,
      nextMaintenance: `${Math.floor(Math.random() * 10000)} km`,
      branchId: `BR-${client.replace(/\s/g, '_')}_MAIN`, // Fake branch ID based on client name

      // Nouveaux champs
      imei: `86${Math.floor(Math.random() * 1000000000000)}`,
      sim: `8933${Math.floor(Math.random() * 1000000000000000)}`,
      deviceModel: isTruck ? 'FMB125' : 'FMB920',
      heading: Math.floor(Math.random() * 360),
      fuelQuantity: fuelQuantity,
      refuelAmount: hasRefuel ? Math.floor(Math.random() * (tankCapacity / 2)) : 0,
      fuelLoss: hasLoss ? Number((Math.random() * 5).toFixed(1)) : 0,
      consumption: isTruck ? Number((Math.random() * 10 + 25).toFixed(1)) : Number((Math.random() * 5 + 7).toFixed(1)),
      suspectLoss: hasSuspect ? Number((Math.random() * 20 + 5).toFixed(1)) : 0,
      
      // Security Flags (Randomly set for demo)
      isImmobilized: Math.random() > 0.95, // 5% chance
      isBrokenDown: Math.random() > 0.95, // 5% chance
      
      // Geofence (Randomly set for demo)
      geofence: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'Zone Industrielle Nord' : 'Dépôt Central') : undefined
    });
  }
  return vehicles;
};

// Génération de zones pour la démo
export const INITIAL_ZONES: Zone[] = [
    {
        id: 'ZONE-001',
        name: 'Paris Centre - Zone Faible Émission',
        type: 'CIRCLE',
        center: { lat: 48.8566, lng: 2.3522 },
        radius: 8000, // 8km
        color: '#ef4444', // Red
        category: 'RESTRICTED'
    },
    {
        id: 'ZONE-002',
        name: 'Dépôt Lyon Sud',
        type: 'CIRCLE',
        center: { lat: 45.7000, lng: 4.8500 },
        radius: 3000,
        color: '#3b82f6', // Blue
        category: 'DEPOT'
    },
    {
        id: 'ZONE-003',
        name: 'Port de Marseille',
        type: 'CIRCLE',
        center: { lat: 43.3000, lng: 5.3600 },
        radius: 5000,
        color: '#10b981', // Green
        category: 'CLIENT'
    },
    {
        id: 'ZONE-004',
        name: 'HQ Bruxelles',
        type: 'CIRCLE',
        center: { lat: 50.8503, lng: 4.3517 },
        radius: 2000,
        color: '#8b5cf6', // Purple
        category: 'HQ'
    }
];

// Génération de 1000 véhicules comme demandé
export const INITIAL_VEHICLES: Vehicle[] = generateVehicles(1000);

// --- CONFIGURATION TECHNIQUE (TECH VIEW) ---

export const HARDWARE_CATALOG = [
    'FMB920 (Teltonika)', 'FMB120 (Teltonika)', 'FMB140 (CAN)', 'Ruptela Trace5', 
    'Carte SIM M2M', 'Lecteur de Badge', 'Sonde Température', 'Relais Coupure 12V',
    'Relais Coupure 24V', 'Bouton Panique', 'Buzzer', 'Câble FMB', 'Jauge Carburant (Analog)', 'Jauge Carburant (RS232)'
];

export const PRODUCT_CATALOG: CatalogItem[] = [
  { id: 'CAT-001', name: 'Boîtier GPS Standard', type: 'Produit', category: 'Matériel', price: 45000, unit: 'unité', status: 'ACTIVE', stockReference: 'FMB920' },
  { id: 'CAT-002', name: 'Boîtier GPS Avancé (CanBus)', type: 'Produit', category: 'Matériel', price: 85000, unit: 'unité', status: 'ACTIVE', stockReference: 'FMB140' },
  { id: 'CAT-003', name: 'Sonde de Carburant', type: 'Produit', category: 'Matériel', price: 65000, unit: 'unité', status: 'ACTIVE' },
  { id: 'CAT-004', name: 'Abonnement Basic', type: 'Service', category: 'Abonnement', price: 5000, unit: '/mois', status: 'ACTIVE', includesSubscription: true },
  { id: 'CAT-005', name: 'Abonnement Premium', type: 'Service', category: 'Abonnement', price: 10000, unit: '/mois', status: 'ACTIVE', includesSubscription: true },
  { id: 'CAT-006', name: 'Installation sur site', type: 'Service', category: 'Prestation', price: 15000, unit: 'forfait', status: 'ACTIVE' },
  
  // Packages
  { id: 'PACK-001', name: 'PACK GPS AUTO', type: 'Service', category: 'Package', price: 60000, unit: 'forfait', status: 'ACTIVE', isPackage: true, includesSubscription: true, stockReference: 'FMB920' },
  { id: 'PACK-002', name: 'PACK VTC', type: 'Service', category: 'Package', price: 75000, unit: 'forfait', status: 'ACTIVE', isPackage: true, includesSubscription: true, stockReference: 'FMB920' },
  { id: 'PACK-003', name: 'PACK CAMION', type: 'Service', category: 'Package', price: 120000, unit: 'forfait', status: 'ACTIVE', isPackage: true, includesSubscription: true, stockReference: 'FMB140' },
];

export const SYSCOHADA_ACCOUNTS = [
    // CLASSE 6 : CHARGES
    { code: '601100', label: 'Achats de marchandises', class: '6' },
    { code: '602100', label: 'Achats de matières premières', class: '6' },
    { code: '604100', label: 'Achats de matières consommables', class: '6' },
    { code: '605100', label: 'Fournitures non stockables (Eau, Électricité)', class: '6' },
    { code: '605500', label: 'Fournitures de bureau', class: '6' },
    { code: '608100', label: 'Frais accessoires d\'achat', class: '6' },
    { code: '624100', label: 'Transports sur achats', class: '6' },
    { code: '625100', label: 'Déplacements, missions et réceptions', class: '6' },
    { code: '631100', label: 'Frais bancaires', class: '6' },
    
    // CLASSE 7 : PRODUITS
    { code: '701100', label: 'Ventes de marchandises', class: '7' },
    { code: '702100', label: 'Ventes de produits finis', class: '7' },
    { code: '704100', label: 'Travaux facturés', class: '7' },
    { code: '705100', label: 'Travaux d\'études', class: '7' },
    { code: '706100', label: 'Services vendus', class: '7' },
    { code: '707100', label: 'Produits accessoires', class: '7' },
    { code: '707000', label: 'Ventes de marchandises (Général)', class: '7' },
];

export const LOCATIONS_COORDS: Record<string, {lat: number, lng: number}> = {
    'Dépôt A': { lat: 48.90, lng: 2.40 },
    'Dépôt B': { lat: 48.85, lng: 2.30 },
    'Garage Central': { lat: 48.86, lng: 2.35 },
    'Zone Fret': { lat: 48.92, lng: 2.45 },
    'Centre Tri': { lat: 48.75, lng: 2.40 },
    'Hyper': { lat: 48.80, lng: 2.60 },
    'Base': { lat: 48.90, lng: 2.20 },
};

// Helpers colors for map & planning
export const getStatusColorHex = (status: string) => {
    switch(status) {
        case 'COMPLETED': return '#22c55e'; // Green
        case 'IN_PROGRESS': return '#f97316'; // Orange
        case 'EN_ROUTE': return '#a855f7'; // Purple
        case 'SCHEDULED': return '#3b82f6'; // Blue
        case 'CANCELLED': return '#ef4444'; // Red
        default: return '#94a3b8'; // Slate
    }
};

export const getStatusBgClass = (status: string) => {
    switch(status) {
        case 'COMPLETED': return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
        case 'IN_PROGRESS': return 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
        case 'EN_ROUTE': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
        case 'SCHEDULED': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
        case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
        default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
};

export const REPORT_PERIODS = [
    { id: 'ALL', label: "Toutes les périodes" },
    { id: 'TODAY', label: "Aujourd'hui" },
    { id: 'YESTERDAY', label: "Hier" },
    { id: 'THIS_WEEK', label: "Cette semaine" },
    { id: 'LAST_WEEK', label: "Semaine précédente" },
    { id: 'THIS_MONTH', label: "Ce mois" },
    { id: 'LAST_MONTH', label: "Mois précédent" },
    { id: 'THIS_YEAR', label: "Cette année" },
    { id: 'LAST_YEAR', label: "Année précédente" },
    { id: 'CUSTOM', label: "Personnalisé" },
];

export const REPORT_CATEGORIES = [
    {
        title: 'Activité & Flotte',
        items: [
            { id: 'trips', label: 'Trajets & Arrêts', icon: Map, columns: ['Véhicule', 'Conducteur', 'Départ', 'Arrivée', 'Durée', 'Distance', 'Lieu Départ', 'Lieu Arrivée'] },
            { id: 'activity', label: 'Rapport d\'Activité', icon: Clock, columns: ['Véhicule', 'Date', 'Début Service', 'Fin Service', 'Temps Conduite', 'Temps Arrêt', 'Distance Totale'] },
            { id: 'utilization', label: 'Utilisation Flotte', icon: Truck, columns: ['Véhicule', 'Jours Actifs', 'Distance Moyenne', 'Heures Moteur', 'Taux Utilisation'] },
        ]
    },
    {
        title: 'Performance & Éco',
        items: [
            { id: 'eco_driving', label: 'Éco-Conduite', icon: BarChart3, columns: ['Conducteur', 'Véhicule', 'Score Global', 'Freinages Brusques', 'Accélérations', 'Ralenti Excessif', 'Conso Moyenne'] },
            { id: 'fuel', label: 'Carburant & Conso', icon: Fuel, columns: ['Véhicule', 'Date', 'Volume Plein', 'Lieu', 'Coût', 'Conso Moyenne', 'Anomalie'] },
            { id: 'maintenance', label: 'Maintenance', icon: Settings, columns: ['Véhicule', 'Type', 'Date Prévue', 'Kilométrage', 'Statut', 'Coût Estimé'] },
        ]
    },
    {
        title: 'Sécurité & Conformité',
        items: [
            { id: 'safety', label: 'Sécurité Routière', icon: AlertTriangle, columns: ['Véhicule', 'Conducteur', 'Date', 'Type Incident', 'Vitesse', 'Lieu', 'Gravité'] },
            { id: 'geofencing', label: 'Entrées/Sorties Zone', icon: Map, columns: ['Véhicule', 'Zone', 'Heure Entrée', 'Heure Sortie', 'Durée sur Site'] },
        ]
    },
    {
        title: 'Gestion & SAV',
        items: [
            { id: 'tickets', label: 'Tickets Support', icon: AlertTriangle, columns: ['ID', 'Sujet', 'Client', 'Priorité', 'Statut', 'Date Création', 'Assigné à'] },
            { id: 'stock', label: 'Inventaire Stock', icon: Settings, columns: ['Modèle', 'IMEI', 'Type', 'Statut', 'Véhicule', 'Date Entrée'] },
        ]
    }
];
