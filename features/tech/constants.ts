// ── Configuration GPS Server ─────────────────────────────
export const GPS_SERVER_IP = import.meta.env.VITE_GPS_SERVER_IP ?? '148.230.126.62';
export const GPS_SERVER_PORT = import.meta.env.VITE_GPS_SERVER_PORT ?? 5000;
export const DEFAULT_APN = import.meta.env.VITE_DEFAULT_APN ?? 'orange.ci';

// Coordonnées des principales villes de Côte d'Ivoire
export const LOCATIONS_COORDS: Record<string, { lat: number; lng: number }> = {
  // Abidjan - Districts et communes
  Abidjan: { lat: 5.36, lng: -4.0083 },
  'Abidjan Plateau': { lat: 5.32, lng: -4.02 },
  'Abidjan Cocody': { lat: 5.35, lng: -3.98 },
  'Abidjan Marcory': { lat: 5.3, lng: -3.99 },
  'Abidjan Treichville': { lat: 5.29, lng: -4.0 },
  'Abidjan Yopougon': { lat: 5.34, lng: -4.08 },
  'Abidjan Abobo': { lat: 5.42, lng: -4.02 },
  'Abidjan Adjamé': { lat: 5.36, lng: -4.03 },
  'Abidjan Koumassi': { lat: 5.29, lng: -3.96 },
  'Abidjan Port-Bouët': { lat: 5.26, lng: -3.93 },
  'Abidjan Bingerville': { lat: 5.36, lng: -3.89 },
  'Abidjan Anyama': { lat: 5.49, lng: -4.05 },
  'Abidjan Songon': { lat: 5.38, lng: -4.26 },

  // Grandes villes
  Bouaké: { lat: 7.69, lng: -5.03 },
  Daloa: { lat: 6.87, lng: -6.45 },
  Yamoussoukro: { lat: 6.82, lng: -5.28 },
  'San-Pédro': { lat: 4.75, lng: -6.64 },
  Korhogo: { lat: 9.46, lng: -5.64 },
  Man: { lat: 7.41, lng: -7.55 },
  Gagnoa: { lat: 6.13, lng: -5.95 },
  Divo: { lat: 5.84, lng: -5.36 },
  Abengourou: { lat: 6.73, lng: -3.49 },
  Agboville: { lat: 5.93, lng: -4.22 },

  // Villes moyennes
  Bondoukou: { lat: 8.04, lng: -2.8 },
  Séguéla: { lat: 7.96, lng: -6.67 },
  Odienné: { lat: 9.51, lng: -7.56 },
  Ferkessédougou: { lat: 9.59, lng: -5.19 },
  Dabou: { lat: 5.33, lng: -4.38 },
  'Grand-Bassam': { lat: 5.21, lng: -3.74 },
  Sassandra: { lat: 4.95, lng: -6.09 },
  Soubré: { lat: 5.79, lng: -6.61 },
  Duékoué: { lat: 6.74, lng: -7.35 },
  Guiglo: { lat: 6.54, lng: -7.49 },
  Issia: { lat: 6.49, lng: -6.59 },
  Oumé: { lat: 6.38, lng: -5.42 },
  Sinfra: { lat: 6.62, lng: -5.91 },
  Lakota: { lat: 5.85, lng: -5.69 },
  Tiassalé: { lat: 5.9, lng: -4.83 },
  Adzopé: { lat: 6.11, lng: -3.86 },
  Daoukro: { lat: 7.06, lng: -3.97 },
  Bouaflé: { lat: 6.99, lng: -5.74 },
  Toumodi: { lat: 6.55, lng: -5.02 },
  Dimbokro: { lat: 6.65, lng: -4.71 },
  Bongouanou: { lat: 6.65, lng: -4.2 },
  Katiola: { lat: 8.14, lng: -5.1 },
  Boundiali: { lat: 9.52, lng: -6.49 },
  Tengrela: { lat: 10.48, lng: -6.4 },
  Touba: { lat: 8.28, lng: -7.68 },
  Biankouma: { lat: 7.74, lng: -7.61 },
  Danané: { lat: 7.26, lng: -8.15 },
  Bangolo: { lat: 7.01, lng: -7.49 },
  Taï: { lat: 5.87, lng: -7.46 },
  Tabou: { lat: 4.42, lng: -7.35 },
  Fresco: { lat: 5.09, lng: -5.57 },
  'Grand-Lahou': { lat: 5.14, lng: -5.02 },
  Jacqueville: { lat: 5.21, lng: -4.42 },
  Bonoua: { lat: 5.27, lng: -3.59 },
  Alépé: { lat: 5.5, lng: -3.67 },
  Anyama: { lat: 5.49, lng: -4.05 },
};

export const INTERVENTION_TYPES = [
  'INSTALLATION',
  'DEPANNAGE',
  'REMPLACEMENT',
  'RETRAIT',
  'REINSTALLATION',
  'TRANSFERT',
] as const;

export const INTERVENTION_NATURES = [
  'Installation',
  'Balise',
  'Balise et relais',
  'Balise et jauge',
  'Jauge',
  'Balise et autres accessoires',
  'Accessoires',
  'Autres',
  'Dépannage',
  'Reprise branchements',
  'Redémarrage balise',
  "Changement d'emplacement",
  'Recalibrage Jauge',
  'Réinstallation',
  'Transfert',
  'Retrait',
  'SIM',
  'Balise SIM',
] as const;

export const INTERVENTION_STATUSES = {
  PENDING: 'À planifier',
  SCHEDULED: 'Planifié',
  EN_ROUTE: 'En route',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
  POSTPONED: 'Reportée',
} as const;

export const getStatusColorHex = (status: string) => {
  switch (status) {
    case 'PENDING':
      return '#94a3b8'; // slate-400
    case 'SCHEDULED':
      return '#3b82f6'; // blue-500
    case 'EN_ROUTE':
      return '#a855f7'; // purple-500
    case 'IN_PROGRESS':
      return '#f97316'; // orange-500
    case 'COMPLETED':
      return '#22c55e'; // green-500
    case 'CANCELLED':
      return '#ef4444'; // red-500
    case 'POSTPONED':
      return '#eab308'; // yellow-500
    default:
      return '#94a3b8';
  }
};

export const cleanPlate = (plate: string | undefined) => {
  if (!plate) return '';
  return plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
};

export const INTERVENTION_COLUMNS = [
  { id: 'id', label: 'ID' },
  { id: 'client', label: 'Client' },
  { id: 'type', label: 'Type' },
  { id: 'status', label: 'Statut' },
  { id: 'technician', label: 'Technicien' },
  { id: 'date', label: 'Date' },
  { id: 'vehicle', label: 'Véhicule' },
  { id: 'location', label: 'Lieu' },
  { id: 'priority', label: 'Priorité' },
];

export const MONITORING_THRESHOLDS = {
  OFFLINE_WARNING_HOURS: 1,
  OFFLINE_CRITICAL_HOURS: 24,
  OFFLINE_ZOMBIE_HOURS: 168, // 7 days
};
