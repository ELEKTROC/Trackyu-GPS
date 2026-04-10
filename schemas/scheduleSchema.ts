import { z } from 'zod';

// Plage horaire pour un jour
const TimeRangeSchema = z.object({
  enabled: z.boolean().default(false),
  start: z.string().default('00:00'),
  end: z.string().default('23:59'),
});

// Schéma complet des règles de travail
export const ScheduleSchema = z.object({
  id: z.string().optional(),
  resellerId: z.string().optional(),
  client: z.string().optional(),
  nom: z.string().min(1, "Le nom de la règle est requis"),
  description: z.string().optional(),
  
  // Type de règle principal
  ruleType: z.enum([
    'SCHEDULED_IMMOBILIZATION',  // Immobilisation programmée (ex: 02h-05h)
    'WORKING_HOURS',             // Heures de travail autorisées
    'FORBIDDEN_HOURS',           // Heures interdites
    'SPEED_LIMIT',               // Limite de vitesse
    'DISTANCE_LIMIT',            // Limite kilométrage journalier
    'ENGINE_HOURS_LIMIT',        // Limite heures moteur
    'GEOFENCE_RESTRICTION',      // Interdiction de zone
    'WEEKEND_RESTRICTION',       // Interdiction weekend
    'NIGHT_RESTRICTION',         // Interdiction conduite de nuit
    'CUSTOM'                     // Règle personnalisée
  ]).default('WORKING_HOURS'),
  
  // Scope - Véhicules concernés
  vehicleIds: z.array(z.string()).optional(),
  allVehicles: z.boolean().default(false),

  // ═══════════════════════════════════════════════════════════
  // RÈGLE 1: IMMOBILISATION PROGRAMMÉE
  // Ex: Immobiliser de 02h à 05h tous les jours
  // ═══════════════════════════════════════════════════════════
  scheduledImmobilization: z.object({
    enabled: z.boolean().default(false),
    startTime: z.string().default('02:00'),  // Heure activation immobilisation
    endTime: z.string().default('05:00'),    // Heure désactivation
    days: z.array(z.string()).default(['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']),
    allowOverride: z.boolean().default(false), // Permettre désactivation manuelle
  }).optional(),

  // ═══════════════════════════════════════════════════════════
  // RÈGLE 2: RESTRICTION HORAIRE (Travail / Interdiction)
  // ═══════════════════════════════════════════════════════════
  timeRestriction: z.object({
    enabled: z.boolean().default(false),
    mode: z.enum(['ALLOWED', 'FORBIDDEN']).default('ALLOWED'),
    // Plages par jour de la semaine
    monday: TimeRangeSchema.optional(),
    tuesday: TimeRangeSchema.optional(),
    wednesday: TimeRangeSchema.optional(),
    thursday: TimeRangeSchema.optional(),
    friday: TimeRangeSchema.optional(),
    saturday: TimeRangeSchema.optional(),
    sunday: TimeRangeSchema.optional(),
  }).optional(),

  // ═══════════════════════════════════════════════════════════
  // RÈGLE 3: LIMITE DE VITESSE
  // ═══════════════════════════════════════════════════════════
  speedLimit: z.object({
    enabled: z.boolean().default(false),
    maxSpeed: z.number().min(0).max(250).default(90),
    toleranceSeconds: z.number().default(10), // Durée avant alerte
    immobilizeOnViolation: z.boolean().default(false),
  }).optional(),

  // ═══════════════════════════════════════════════════════════
  // RÈGLE 4: LIMITE KILOMÉTRIQUE JOURNALIÈRE
  // ═══════════════════════════════════════════════════════════
  distanceLimit: z.object({
    enabled: z.boolean().default(false),
    maxKmPerDay: z.number().min(0).default(500),
    resetTime: z.string().default('00:00'), // Heure de reset du compteur
    immobilizeOnLimit: z.boolean().default(false),
  }).optional(),

  // ═══════════════════════════════════════════════════════════
  // RÈGLE 5: LIMITE HEURES MOTEUR
  // ═══════════════════════════════════════════════════════════
  engineHoursLimit: z.object({
    enabled: z.boolean().default(false),
    maxHoursPerDay: z.number().min(0).max(24).default(10),
    resetTime: z.string().default('00:00'),
  }).optional(),

  // ═══════════════════════════════════════════════════════════
  // RÈGLE 6: RESTRICTION DE ZONE (Géofence)
  // ═══════════════════════════════════════════════════════════
  geofenceRestriction: z.object({
    enabled: z.boolean().default(false),
    mode: z.enum(['ALLOWED_ZONES', 'FORBIDDEN_ZONES']).default('FORBIDDEN_ZONES'),
    zoneIds: z.array(z.string()).default([]),
    immobilizeOnViolation: z.boolean().default(false),
  }).optional(),

  // ═══════════════════════════════════════════════════════════
  // RÈGLE 7: RESTRICTION WEEKEND
  // ═══════════════════════════════════════════════════════════
  weekendRestriction: z.object({
    enabled: z.boolean().default(false),
    immobilizeDuringWeekend: z.boolean().default(false),
    startDay: z.enum(['Friday', 'Saturday']).default('Saturday'),
    startTime: z.string().default('00:00'),
    endDay: z.enum(['Sunday', 'Monday']).default('Monday'),
    endTime: z.string().default('06:00'),
  }).optional(),

  // ═══════════════════════════════════════════════════════════
  // RÈGLE 8: RESTRICTION NUIT
  // ═══════════════════════════════════════════════════════════
  nightRestriction: z.object({
    enabled: z.boolean().default(false),
    startTime: z.string().default('22:00'),
    endTime: z.string().default('06:00'),
    immobilizeAtNight: z.boolean().default(false),
  }).optional(),

  // ═══════════════════════════════════════════════════════════
  // ACTIONS EN CAS DE VIOLATION
  // ═══════════════════════════════════════════════════════════
  actions: z.object({
    createAlert: z.boolean().default(true),
    alertPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    immobilize: z.boolean().default(false),
    notifyEmail: z.boolean().default(false),
    notifySms: z.boolean().default(false),
    notifyPush: z.boolean().default(true),
    notifyUserIds: z.array(z.string()).optional(),
    customEmails: z.string().optional(),
    customPhones: z.string().optional(),
  }).optional(),

  statut: z.enum(['Actif', 'Inactif']).default('Actif'),
});

export type ScheduleFormData = z.infer<typeof ScheduleSchema>;

// Types de règles avec descriptions pour l'UI
export const RULE_TYPES = [
  { 
    id: 'SCHEDULED_IMMOBILIZATION', 
    label: 'Immobilisation Programmée',
    description: 'Immobiliser automatiquement le véhicule pendant une plage horaire définie',
    icon: 'Lock',
    color: 'red'
  },
  { 
    id: 'WORKING_HOURS', 
    label: 'Heures de Travail',
    description: 'Définir les heures pendant lesquelles le véhicule peut circuler',
    icon: 'Clock',
    color: 'green'
  },
  { 
    id: 'FORBIDDEN_HOURS', 
    label: 'Heures Interdites',
    description: 'Définir les heures pendant lesquelles le véhicule ne doit pas circuler',
    icon: 'Clock',
    color: 'orange'
  },
  { 
    id: 'SPEED_LIMIT', 
    label: 'Limite de Vitesse',
    description: 'Imposer une vitesse maximale aux véhicules',
    icon: 'Gauge',
    color: 'orange'
  },
  { 
    id: 'DISTANCE_LIMIT', 
    label: 'Limite Kilométrique',
    description: 'Limiter le nombre de kilomètres par jour',
    icon: 'Route',
    color: 'blue'
  },
  { 
    id: 'ENGINE_HOURS_LIMIT', 
    label: 'Limite Heures Moteur',
    description: 'Limiter le temps de fonctionnement moteur par jour',
    icon: 'Timer',
    color: 'purple'
  },
  { 
    id: 'GEOFENCE_RESTRICTION', 
    label: 'Restriction de Zone',
    description: 'Interdire ou autoriser certaines zones géographiques',
    icon: 'MapPin',
    color: 'blue'
  },
  { 
    id: 'WEEKEND_RESTRICTION', 
    label: 'Restriction Weekend',
    description: 'Interdire l\'utilisation du véhicule pendant le weekend',
    icon: 'Calendar',
    color: 'slate'
  },
  { 
    id: 'NIGHT_RESTRICTION', 
    label: 'Restriction Nocturne',
    description: 'Interdire la conduite de nuit',
    icon: 'Moon',
    color: 'indigo'
  },
  { 
    id: 'CUSTOM', 
    label: 'Règle Personnalisée',
    description: 'Créer une règle personnalisée',
    icon: 'Settings',
    color: 'slate'
  },
];
