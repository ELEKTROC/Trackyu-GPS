import { Ticket } from '../../../types';
import { SLA_CONFIG } from '../utils';

/**
 * Calcule le temps de résolution d'un ticket (en minutes)
 * Temps entre createdAt et resolvedAt
 */
export function calculateTicketResolutionTime(ticket: Ticket): number | null {
    if (!ticket.resolvedAt || !ticket.createdAt) return null;

    const start = new Date(ticket.createdAt).getTime();
    const end = new Date(ticket.resolvedAt).getTime();

    if (isNaN(start) || isNaN(end) || end < start) return null;

    return Math.round((end - start) / (1000 * 60)); // minutes
}

/**
 * Calcule le temps de réponse (temps avant prise en charge)
 * Temps entre createdAt et startedAt (passage à IN_PROGRESS)
 */
export function calculateTicketResponseTime(ticket: Ticket): number | null {
    if (!ticket.startedAt || !ticket.createdAt) return null;

    const start = new Date(ticket.createdAt).getTime();
    const end = new Date(ticket.startedAt).getTime();

    if (isNaN(start) || isNaN(end) || end < start) return null;

    return Math.round((end - start) / (1000 * 60)); // minutes
}

/**
 * Calcule le temps de traitement (temps de travail effectif)
 * Temps entre startedAt et resolvedAt
 */
export function calculateTicketHandlingTime(ticket: Ticket): number | null {
    if (!ticket.startedAt || !ticket.resolvedAt) return null;

    const start = new Date(ticket.startedAt).getTime();
    const end = new Date(ticket.resolvedAt).getTime();

    if (isNaN(start) || isNaN(end) || end < start) return null;

    return Math.round((end - start) / (1000 * 60)); // minutes
}

/**
 * Formate une durée en minutes vers un format lisible
 */
export function formatTicketDuration(minutes: number | null): string {
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
}

/**
 * Vérifie si le ticket dépasse le SLA
 */
export function isTicketOverSLA(ticket: Ticket, slaConfig?: any): boolean {
    const config = slaConfig || SLA_CONFIG;
    // Handle both case structures (settings usually lowercase, utils uppercase)
    const priorityKey = ticket.priority;
    const slaHours = config[priorityKey] ||
        config[priorityKey.toLowerCase()] ||
        config[priorityKey.toUpperCase()] ||
        SLA_CONFIG[priorityKey as keyof typeof SLA_CONFIG] || 48;

    const resolutionMinutes = calculateTicketResolutionTime(ticket);

    if (resolutionMinutes === null) {
        // Ticket non résolu, calculer le temps écoulé depuis création
        const elapsed = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
        return elapsed > slaHours;
    }

    return (resolutionMinutes / 60) > slaHours;
}

/**
 * Retourne une couleur Tailwind selon le temps de résolution et la priorité
 */
export function getTicketResolutionColor(minutes: number | null, priority: string, slaConfig?: any): string {
    if (minutes === null) return 'text-slate-400';

    const hours = minutes / 60;
    const config = slaConfig || SLA_CONFIG;
    const slaHours = config[priority] ||
        config[priority.toLowerCase()] ||
        config[priority.toUpperCase()] ||
        SLA_CONFIG[priority as keyof typeof SLA_CONFIG] || 48;

    // Vert: < 50% du SLA
    // Orange: 50-100% du SLA
    // Rouge: > 100% du SLA
    if (hours <= slaHours * 0.5) {
        return 'text-green-600';
    } else if (hours <= slaHours) {
        return 'text-orange-500';
    } else {
        return 'text-red-600';
    }
}

/**
 * Interface pour les statistiques de résolution
 */
export interface TicketResolutionStats {
    average: number | null;
    median: number | null;
    min: number | null;
    max: number | null;
    count: number;
    withinSLA: number;
    slaComplianceRate: number;
    avgResponseTime: number | null;
    avgHandlingTime: number | null;
}

/**
 * Calcule les statistiques de résolution pour un ensemble de tickets
 */
export function calculateTicketResolutionStats(tickets: Ticket[], slaConfig?: any): TicketResolutionStats {
    const resolvedTickets = tickets.filter(t =>
        ['RESOLVED', 'CLOSED'].includes(t.status) && t.resolvedAt
    );

    const resolutionTimes = resolvedTickets
        .map(t => calculateTicketResolutionTime(t))
        .filter((t): t is number => t !== null);

    const responseTimes = resolvedTickets
        .map(t => calculateTicketResponseTime(t))
        .filter((t): t is number => t !== null);

    const handlingTimes = resolvedTickets
        .map(t => calculateTicketHandlingTime(t))
        .filter((t): t is number => t !== null);

    // Tickets résolus dans le SLA
    const withinSLA = resolvedTickets.filter(t => !isTicketOverSLA(t, slaConfig)).length;

    if (resolutionTimes.length === 0) {
        return {
            average: null,
            median: null,
            min: null,
            max: null,
            count: 0,
            withinSLA: 0,
            slaComplianceRate: 100,
            avgResponseTime: null,
            avgHandlingTime: null
        };
    }

    const sorted = [...resolutionTimes].sort((a, b) => a - b);
    const sum = resolutionTimes.reduce((acc, t) => acc + t, 0);

    const responseSum = responseTimes.reduce((acc, t) => acc + t, 0);
    const handlingSum = handlingTimes.reduce((acc, t) => acc + t, 0);

    return {
        average: Math.round(sum / resolutionTimes.length),
        median: sorted[Math.floor(sorted.length / 2)],
        min: sorted[0],
        max: sorted[sorted.length - 1],
        count: resolutionTimes.length,
        withinSLA,
        slaComplianceRate: Math.round((withinSLA / resolvedTickets.length) * 100),
        avgResponseTime: responseTimes.length > 0 ? Math.round(responseSum / responseTimes.length) : null,
        avgHandlingTime: handlingTimes.length > 0 ? Math.round(handlingSum / handlingTimes.length) : null
    };
}

/**
 * Obtient le label de performance basé sur le temps
 */
export function getPerformanceLabel(minutes: number | null, priority: string, slaConfig?: any): string {
    if (minutes === null) return 'N/A';

    const hours = minutes / 60;
    const config = slaConfig || SLA_CONFIG;
    const slaHours = config[priority] ||
        config[priority.toLowerCase()] ||
        config[priority.toUpperCase()] ||
        SLA_CONFIG[priority as keyof typeof SLA_CONFIG] || 48;

    if (hours <= slaHours * 0.25) return 'Excellent';
    if (hours <= slaHours * 0.5) return 'Bon';
    if (hours <= slaHours * 0.75) return 'Correct';
    if (hours <= slaHours) return 'Limite';
    return 'Hors SLA';
}
