import type { Intervention } from '../../../types';

/**
 * Calcule le temps de résolution d'une intervention en minutes
 * @param intervention L'intervention à analyser
 * @returns Temps en minutes, ou null si non applicable
 */
export const calculateResolutionTime = (intervention: Intervention): number | null => {
    // Seulement pour les interventions terminées avec startTime et endTime
    if (intervention.status !== 'COMPLETED') return null;
    if (!intervention.startTime || !intervention.endTime) return null;

    const start = new Date(intervention.startTime).getTime();
    const end = new Date(intervention.endTime).getTime();
    
    if (isNaN(start) || isNaN(end)) return null;
    
    const diffMs = end - start;
    if (diffMs < 0) return null;
    
    return Math.round(diffMs / (1000 * 60)); // Retourne en minutes
};

/**
 * Calcule le temps de réponse (création → début intervention)
 * @param intervention L'intervention à analyser
 * @returns Temps en minutes, ou null si non applicable
 */
export const calculateResponseTime = (intervention: Intervention): number | null => {
    if (!intervention.createdAt || !intervention.startTime) return null;
    
    const created = new Date(intervention.createdAt).getTime();
    const start = new Date(intervention.startTime).getTime();
    
    if (isNaN(created) || isNaN(start)) return null;
    
    const diffMs = start - created;
    if (diffMs < 0) return null;
    
    return Math.round(diffMs / (1000 * 60));
};

/**
 * Calcule le temps d'attente avant prise en charge (création → assignation tech)
 * On utilise scheduledDate comme proxy pour l'assignation
 */
export const calculateWaitTime = (intervention: Intervention): number | null => {
    if (!intervention.createdAt || !intervention.scheduledDate) return null;
    
    const created = new Date(intervention.createdAt).getTime();
    const scheduled = new Date(intervention.scheduledDate).getTime();
    
    if (isNaN(created) || isNaN(scheduled)) return null;
    
    const diffMs = scheduled - created;
    if (diffMs < 0) return null;
    
    return Math.round(diffMs / (1000 * 60));
};

/**
 * Formate un temps en minutes en format lisible
 * @param minutes Temps en minutes
 * @returns Format lisible (ex: "2h 30min", "45min", "1j 2h")
 */
export const formatDuration = (minutes: number | null): string => {
    if (minutes === null || minutes < 0) return '-';
    
    if (minutes < 60) {
        return `${minutes}min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (remainingHours > 0) {
        return `${days}j ${remainingHours}h`;
    }
    return `${days}j`;
};

/**
 * Calcule les statistiques de temps de résolution pour un ensemble d'interventions
 */
export const calculateResolutionStats = (interventions: Intervention[]) => {
    const completed = interventions.filter(i => i.status === 'COMPLETED');
    const resolutionTimes = completed
        .map(calculateResolutionTime)
        .filter((t): t is number => t !== null);
    
    if (resolutionTimes.length === 0) {
        return {
            average: null,
            median: null,
            min: null,
            max: null,
            count: 0
        };
    }

    const sorted = [...resolutionTimes].sort((a, b) => a - b);
    const sum = resolutionTimes.reduce((a, b) => a + b, 0);
    
    return {
        average: Math.round(sum / resolutionTimes.length),
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: resolutionTimes.length
    };
};

/**
 * Détermine si une intervention dépasse le temps SLA (en heures)
 * @param intervention L'intervention à vérifier
 * @param slaHours Temps SLA en heures (défaut: 4h pour dépannage, 24h pour installation)
 */
export const isOverSLA = (intervention: Intervention, slaHours?: number): boolean => {
    const resolutionMinutes = calculateResolutionTime(intervention);
    if (resolutionMinutes === null) return false;
    
    // SLA par défaut selon le type
    const defaultSLA = intervention.type === 'DEPANNAGE' ? 4 * 60 : 24 * 60; // en minutes
    const slaMinutes = slaHours ? slaHours * 60 : defaultSLA;
    
    return resolutionMinutes > slaMinutes;
};

/**
 * Obtient la couleur de badge selon le temps de résolution
 */
export const getResolutionTimeColor = (minutes: number | null, type?: string): string => {
    if (minutes === null) return 'text-slate-400';
    
    const isUrgent = type === 'DEPANNAGE';
    const thresholdGood = isUrgent ? 60 : 120; // 1h ou 2h
    const thresholdWarning = isUrgent ? 180 : 360; // 3h ou 6h
    
    if (minutes <= thresholdGood) return 'text-green-600';
    if (minutes <= thresholdWarning) return 'text-orange-500';
    return 'text-red-600';
};
