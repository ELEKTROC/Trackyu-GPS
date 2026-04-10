/**
 * Constantes partagées du module Support
 */

// Tous les rôles staff (incluant techniciens) — utilisé pour les interventions
export const STAFF_ROLES = [
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'TECH',
    'SUPPORT',
    'SUPPORT_AGENT',
    'AGENT_TRACKING',
    'COMMERCIAL',
    'COMPTABLE',
] as const;

// Rôles autorisés pour l'assignation de TICKETS (sans techniciens)
// Les techniciens sont assignés aux INTERVENTIONS, pas aux tickets
export const TICKET_ASSIGNABLE_ROLES = [
    'SUPERADMIN',
    'ADMIN',
    'MANAGER',
    'SUPPORT',
    'SUPPORT_AGENT',
    'AGENT_TRACKING',
    'COMMERCIAL',
    'COMPTABLE',
] as const;

// Rôles considérés comme technicien terrain
export const TECHNICIAN_ROLES = ['TECH'] as const;

export type StaffRole = typeof STAFF_ROLES[number];
export type TicketAssignableRole = typeof TICKET_ASSIGNABLE_ROLES[number];
