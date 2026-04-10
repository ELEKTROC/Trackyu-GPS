// ── Configuration GPS Server ─────────────────────────────
export const GPS_SERVER_IP = import.meta.env.VITE_GPS_SERVER_IP ?? '148.230.126.62';
export const GPS_SERVER_PORT = import.meta.env.VITE_GPS_SERVER_PORT ?? 5000;
export const DEFAULT_APN = import.meta.env.VITE_DEFAULT_APN ?? 'orange.ci';

// Coordonnées des principales villes de Côte d'Ivoire
export const LOCATIONS_COORDS: Record<string, { lat: number; lng: number }> = {
    // Abidjan - Districts et communes
    'Abidjan': { lat: 5.3600, lng: -4.0083 },
    'Abidjan Plateau': { lat: 5.3200, lng: -4.0200 },
    'Abidjan Cocody': { lat: 5.3500, lng: -3.9800 },
    'Abidjan Marcory': { lat: 5.3000, lng: -3.9900 },
    'Abidjan Treichville': { lat: 5.2900, lng: -4.0000 },
    'Abidjan Yopougon': { lat: 5.3400, lng: -4.0800 },
    'Abidjan Abobo': { lat: 5.4200, lng: -4.0200 },
    'Abidjan Adjamé': { lat: 5.3600, lng: -4.0300 },
    'Abidjan Koumassi': { lat: 5.2900, lng: -3.9600 },
    'Abidjan Port-Bouët': { lat: 5.2600, lng: -3.9300 },
    'Abidjan Bingerville': { lat: 5.3600, lng: -3.8900 },
    'Abidjan Anyama': { lat: 5.4900, lng: -4.0500 },
    'Abidjan Songon': { lat: 5.3800, lng: -4.2600 },
    
    // Grandes villes
    'Bouaké': { lat: 7.6900, lng: -5.0300 },
    'Daloa': { lat: 6.8700, lng: -6.4500 },
    'Yamoussoukro': { lat: 6.8200, lng: -5.2800 },
    'San-Pédro': { lat: 4.7500, lng: -6.6400 },
    'Korhogo': { lat: 9.4600, lng: -5.6400 },
    'Man': { lat: 7.4100, lng: -7.5500 },
    'Gagnoa': { lat: 6.1300, lng: -5.9500 },
    'Divo': { lat: 5.8400, lng: -5.3600 },
    'Abengourou': { lat: 6.7300, lng: -3.4900 },
    'Agboville': { lat: 5.9300, lng: -4.2200 },
    
    // Villes moyennes
    'Bondoukou': { lat: 8.0400, lng: -2.8000 },
    'Séguéla': { lat: 7.9600, lng: -6.6700 },
    'Odienné': { lat: 9.5100, lng: -7.5600 },
    'Ferkessédougou': { lat: 9.5900, lng: -5.1900 },
    'Dabou': { lat: 5.3300, lng: -4.3800 },
    'Grand-Bassam': { lat: 5.2100, lng: -3.7400 },
    'Sassandra': { lat: 4.9500, lng: -6.0900 },
    'Soubré': { lat: 5.7900, lng: -6.6100 },
    'Duékoué': { lat: 6.7400, lng: -7.3500 },
    'Guiglo': { lat: 6.5400, lng: -7.4900 },
    'Issia': { lat: 6.4900, lng: -6.5900 },
    'Oumé': { lat: 6.3800, lng: -5.4200 },
    'Sinfra': { lat: 6.6200, lng: -5.9100 },
    'Lakota': { lat: 5.8500, lng: -5.6900 },
    'Tiassalé': { lat: 5.9000, lng: -4.8300 },
    'Adzopé': { lat: 6.1100, lng: -3.8600 },
    'Daoukro': { lat: 7.0600, lng: -3.9700 },
    'Bouaflé': { lat: 6.9900, lng: -5.7400 },
    'Toumodi': { lat: 6.5500, lng: -5.0200 },
    'Dimbokro': { lat: 6.6500, lng: -4.7100 },
    'Bongouanou': { lat: 6.6500, lng: -4.2000 },
    'Katiola': { lat: 8.1400, lng: -5.1000 },
    'Boundiali': { lat: 9.5200, lng: -6.4900 },
    'Tengrela': { lat: 10.4800, lng: -6.4000 },
    'Touba': { lat: 8.2800, lng: -7.6800 },
    'Biankouma': { lat: 7.7400, lng: -7.6100 },
    'Danané': { lat: 7.2600, lng: -8.1500 },
    'Bangolo': { lat: 7.0100, lng: -7.4900 },
    'Taï': { lat: 5.8700, lng: -7.4600 },
    'Tabou': { lat: 4.4200, lng: -7.3500 },
    'Fresco': { lat: 5.0900, lng: -5.5700 },
    'Grand-Lahou': { lat: 5.1400, lng: -5.0200 },
    'Jacqueville': { lat: 5.2100, lng: -4.4200 },
    'Bonoua': { lat: 5.2700, lng: -3.5900 },
    'Alépé': { lat: 5.5000, lng: -3.6700 },
    'Anyama': { lat: 5.4900, lng: -4.0500 },
};

export const INTERVENTION_TYPES = ['INSTALLATION', 'DEPANNAGE', 'REMPLACEMENT', 'RETRAIT', 'REINSTALLATION', 'TRANSFERT'] as const;

export const INTERVENTION_NATURES = [
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
    'Changement d\'emplacement',
    'Recalibrage Jauge',
    'Réinstallation',
    'Transfert',
    'Retrait',
    'SIM',
    'Balise SIM'
] as const;

export const INTERVENTION_STATUSES = {
    PENDING: 'À planifier',
    SCHEDULED: 'Planifié',
    EN_ROUTE: 'En route',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
    POSTPONED: 'Reportée'
} as const;

export const getStatusColorHex = (status: string) => {
    switch (status) {
        case 'PENDING': return '#94a3b8'; // slate-400
        case 'SCHEDULED': return '#3b82f6'; // blue-500
        case 'EN_ROUTE': return '#a855f7'; // purple-500
        case 'IN_PROGRESS': return '#f97316'; // orange-500
        case 'COMPLETED': return '#22c55e'; // green-500
        case 'CANCELLED': return '#ef4444'; // red-500
        case 'POSTPONED': return '#eab308'; // yellow-500
        default: return '#94a3b8';
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
