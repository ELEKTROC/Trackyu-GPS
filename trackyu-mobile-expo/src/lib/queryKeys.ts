/**
 * TrackYu Mobile — Dictionnaire centralisé des queryKeys React Query
 *
 * Garantit que la même clé est utilisée pour fetch ET invalidation.
 * Usage : queryClient.invalidateQueries({ queryKey: QK.vehicles.all() })
 */

export const QK = {
  // ── Véhicules ──────────────────────────────────────────────────────────────
  vehicles: {
    all: () => ['vehicles-all'] as const,
    map: () => ['vehicles-all'] as const, // même cache que all
    detail: (id: string) => ['vehicle', id] as const,
    history: (id: string, from: string, to: string) => ['vehicle-history', id, from, to] as const,
    fleet: () => ['fleet-analytics'] as const,
  },

  // ── Conducteurs ────────────────────────────────────────────────────────────
  drivers: {
    all: () => ['drivers'] as const,
  },

  // ── Groupes & Branches ────────────────────────────────────────────────────
  groupes: {
    all: () => ['groupes'] as const,
  },
  branches: {
    all: () => ['branches'] as const,
  },

  // ── Alertes ───────────────────────────────────────────────────────────────
  alerts: {
    all: () => ['alerts'] as const,
    unread: () => ['alerts-unread-count'] as const,
    rules: () => ['alert-rules'] as const,
    configs: () => ['alert-configs'] as const,
  },

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  users: {
    all: () => ['users'] as const,
    detail: (id: string) => ['user', id] as const,
    subusersByParent: (pid: string) => ['subusers', pid] as const,
  },

  // ── Finance ───────────────────────────────────────────────────────────────
  finance: {
    invoices: () => ['invoices'] as const,
    payments: () => ['payments'] as const,
    expenses: () => ['expenses'] as const,
  },

  // ── CRM ───────────────────────────────────────────────────────────────────
  crm: {
    clients: () => ['crm-clients'] as const,
    contracts: () => ['crm-contracts'] as const,
    tiers: () => ['crm-tiers'] as const,
  },

  // ── Support / Tickets ─────────────────────────────────────────────────────
  tickets: {
    all: () => ['tickets'] as const,
    detail: (id: string) => ['ticket', id] as const,
  },

  // ── Interventions ─────────────────────────────────────────────────────────
  interventions: {
    all: () => ['interventions'] as const,
    detail: (id: string) => ['intervention', id] as const,
    byVehicle: (vid: string) => ['interventions-vehicle', vid] as const,
  },

  // ── Maintenance & Pneus ───────────────────────────────────────────────────
  maintenance: {
    all: () => ['maintenance'] as const,
  },
  tires: {
    all: () => ['tires'] as const,
  },

  // ── Géofences ─────────────────────────────────────────────────────────────
  geofences: {
    all: () => ['geofences'] as const,
  },

  // ── Rapports ─────────────────────────────────────────────────────────────
  reports: {
    generate: (type: string, filters: object) => ['report', type, filters] as const,
  },

  // ── Portail client ────────────────────────────────────────────────────────
  portal: {
    invoices: () => ['portal-invoices'] as const,
    contracts: () => ['portal-contracts'] as const,
    tickets: () => ['portal-tickets'] as const,
    interventions: () => ['portal-interventions'] as const,
    subscriptions: () => ['portal-subscriptions'] as const,
  },

  // ── Stock ─────────────────────────────────────────────────────────────────
  stock: {
    all: () => ['stock'] as const,
  },

  // ── Plannings ─────────────────────────────────────────────────────────────
  schedules: {
    all: () => ['schedules'] as const,
  },

  // ── Éco-conduite ─────────────────────────────────────────────────────────
  ecodriving: {
    all: () => ['ecodriving'] as const,
  },

  // ── Aide ──────────────────────────────────────────────────────────────────
  help: {
    articles: () => ['help-articles'] as const,
  },
} as const;

export default QK;
