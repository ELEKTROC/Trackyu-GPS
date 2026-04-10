export const FILTERS_CONFIG = [
    { id: 'ALL', label: 'Tout' },
    { id: 'OPEN', label: 'Ouvert' },
    { id: 'IN_PROGRESS', label: 'En cours' },
    { id: 'WAITING_CLIENT', label: 'En attente' },
    { id: 'RESOLVED', label: 'Résolu' },
    { id: 'CLOSED', label: 'Fermé' },
];

export const PRIORITY_ORDER: Record<string, number> = {
    'CRITICAL': 0,
    'HIGH': 1,
    'MEDIUM': 2,
    'LOW': 3
};

/** @deprecated Use dynamic slaConfig from DataContext instead */
export const SLA_CONFIG = {
    CRITICAL: 4, // 4 hours
    HIGH: 24,    // 24 hours
    MEDIUM: 48,  // 48 hours
    LOW: 72      // 72 hours
};

export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'CRITICAL': return 'border-l-red-500';
        case 'HIGH': return 'border-l-orange-500';
        case 'MEDIUM': return 'border-l-blue-500';
        case 'LOW': return 'border-l-slate-300';
        default: return 'border-l-slate-300';
    }
};

export const getSlaStatus = (date: Date, priority: string, slaConfig?: any) => {
    const hoursElapsed = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
    const config = slaConfig || SLA_CONFIG;
    const limit = config[priority] ||
        config[priority.toLowerCase()] ||
        config[priority.toUpperCase()] ||
        SLA_CONFIG[priority as keyof typeof SLA_CONFIG] || 48;

    if (hoursElapsed > limit) return 'CRITICAL'; // Overdue
    if (hoursElapsed > limit * 0.75) return 'WARNING'; // Near deadline
    return 'OK';
};

export const getStatusInfo = (status: string) => {
    switch (status) {
        case 'OPEN': return { label: 'Ouvert', style: 'bg-blue-100 text-blue-700 border-blue-200' };
        case 'IN_PROGRESS': return { label: 'En Cours', style: 'bg-orange-100 text-orange-700 border-orange-200' };
        case 'WAITING_CLIENT': return { label: 'En Attente', style: 'bg-purple-100 text-purple-700 border-purple-200' };
        case 'RESOLVED': return { label: 'Résolu', style: 'bg-green-100 text-green-700 border-green-200' };
        case 'CLOSED': return { label: 'Fermé', style: 'bg-slate-100 text-slate-700 border-slate-200' };
        default: return { label: status, style: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
};

export const MACROS = [
    { id: 'm1', label: 'Bonjour', text: 'Bonjour, merci de nous avoir contactés.' },
    { id: 'm2', label: 'En cours', text: 'Nous prenons en charge votre demande et revenons vers vous rapidement.' },
    { id: 'm3', label: 'Résolu', text: 'Le problème est résolu. Pouvez-vous confirmer de votre côté ?' },
    { id: 'm4', label: 'Coordonnées', text: 'Pourriez-vous nous confirmer vos coordonnées actuelles ?' },
];

// MOCK DATA FOR CONFIG TABLES (To be replaced by API calls)
/** @deprecated Use ticketCategories from DataContext instead */
export const TICKET_CATEGORIES = [
    { id: 1, name: "Demande d'intervention", icon: 'Wrench' },
    { id: 2, name: 'Tracking', icon: 'Radar' },
    { id: 3, name: 'Gestion de comptes', icon: 'Users' },
    { id: 4, name: 'Assistance', icon: 'HelpCircle' },
    { id: 5, name: 'Commercial', icon: 'Briefcase' },
    { id: 6, name: 'Facturation', icon: 'Euro' }
];

export const TICKET_SUBCATEGORIES = [
    // Demande d'intervention
    { id: 1, categoryId: 1, name: 'Transfert', defaultPriority: 'MEDIUM', slaHours: 72 },
    { id: 2, categoryId: 1, name: 'Retrait', defaultPriority: 'LOW', slaHours: 72 },
    { id: 3, categoryId: 1, name: 'Réinstallation', defaultPriority: 'MEDIUM', slaHours: 72 },
    { id: 4, categoryId: 1, name: 'Dépannage', defaultPriority: 'HIGH', slaHours: 24 },
    { id: 5, categoryId: 1, name: 'Remplacement', defaultPriority: 'MEDIUM', slaHours: 48 },
    { id: 6, categoryId: 1, name: 'Installation', defaultPriority: 'MEDIUM', slaHours: 72 },

    // Tracking
    { id: 7, categoryId: 2, name: "Le carburant n'affiche pas", defaultPriority: 'HIGH', slaHours: 24 },
    { id: 8, categoryId: 2, name: "Demande de rapports d'activités", defaultPriority: 'LOW', slaHours: 48 },
    { id: 9, categoryId: 2, name: 'Localisation', defaultPriority: 'HIGH', slaHours: 24 },
    { id: 10, categoryId: 2, name: 'GPS est inactif ou hors ligne', defaultPriority: 'CRITICAL', slaHours: 4 },
    { id: 11, categoryId: 2, name: 'Données de carburant anormales', defaultPriority: 'HIGH', slaHours: 24 },
    { id: 12, categoryId: 2, name: 'Aide à l immobilisation', defaultPriority: 'CRITICAL', slaHours: 2 },
    { id: 13, categoryId: 2, name: 'Assistance Vol', defaultPriority: 'CRITICAL', slaHours: 1 },

    // Gestion de comptes
    { id: 14, categoryId: 3, name: 'Résiliation', defaultPriority: 'HIGH', slaHours: 48 },
    { id: 15, categoryId: 3, name: 'Ouverture de compte, sous compte', defaultPriority: 'MEDIUM', slaHours: 48 },
    { id: 16, categoryId: 3, name: 'Modification de compte', defaultPriority: 'LOW', slaHours: 72 },
    { id: 17, categoryId: 3, name: 'Mise à jour de plaques', defaultPriority: 'LOW', slaHours: 72 },
    { id: 18, categoryId: 3, name: 'Mutation', defaultPriority: 'LOW', slaHours: 72 },
    { id: 19, categoryId: 3, name: 'Accès & Permissions', defaultPriority: 'HIGH', slaHours: 24 },
    { id: 20, categoryId: 3, name: 'Changement de mot de passe', defaultPriority: 'HIGH', slaHours: 24 },

    // Assistance
    { id: 21, categoryId: 4, name: "Aide a l'utilisation du logiciel", defaultPriority: 'LOW', slaHours: 48 },

    // Commercial
    { id: 22, categoryId: 5, name: 'Devis', defaultPriority: 'MEDIUM', slaHours: 48 },
    { id: 23, categoryId: 5, name: "Demandes d'informations tarifaires", defaultPriority: 'LOW', slaHours: 72 },

    // Facturation
    { id: 24, categoryId: 6, name: 'Paiement', defaultPriority: 'HIGH', slaHours: 48 },
    { id: 25, categoryId: 6, name: 'Contestation de facturation', defaultPriority: 'MEDIUM', slaHours: 72 }
];

export const INTERVENTION_TYPES_CONFIG = [
    { id: 'INSTALLATION', label: 'Installation', defaultDuration: 60, baseCost: 50.00 },
    { id: 'DEPANNAGE', label: 'Dépannage', defaultDuration: 60, baseCost: 30.00 },
    { id: 'REMPLACEMENT', label: 'Remplacement', defaultDuration: 90, baseCost: 40.00 },
    { id: 'RETRAIT', label: 'Retrait', defaultDuration: 45, baseCost: 20.00 },
    { id: 'REINSTALLATION', label: 'Réinstallation', defaultDuration: 60, baseCost: 35.00 },
    { id: 'TRANSFERT', label: 'Transfert', defaultDuration: 90, baseCost: 45.00 }
];
