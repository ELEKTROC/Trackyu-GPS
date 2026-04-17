/**
 * TrackYu Mobile — Reports: shared types
 */
import React from 'react';

export type PeriodKey = '0' | '7' | '30' | '90' | 'custom';
export type FilterKey =
  | 'vehicle'
  | 'client'
  | 'branche'
  | 'revendeur'
  | 'alertType'
  | 'interventionType'
  | 'technicianName';

export interface ReportFilters {
  period: PeriodKey;
  customStart: string;
  customEnd: string;
  vehicleIds: string[];
  client: string;
  branche: string;
  revendeur: string;
  alertTypes: string[];
  /** INSTALLATION | DEPANNAGE | '' (tous) */
  interventionType: string;
  /** Filtre texte sur le nom du technicien */
  technicianName: string;
}

export const DEFAULT_FILTERS: ReportFilters = {
  period: '30',
  customStart: '',
  customEnd: '',
  vehicleIds: [],
  client: '',
  branche: '',
  revendeur: '',
  alertTypes: [],
  interventionType: '',
  technicianName: '',
};

export interface ReportKPI {
  label: string;
  value: string;
  color: string;
}

export interface ChartItem {
  label: string;
  value: number;
  color: string;
}

export interface ChartData {
  type: 'bar' | 'pie';
  title: string;
  items: ChartItem[];
}

export interface ReportGroup {
  /** One summary row (same length as ReportResult.columns) */
  summary: string[];
  /** Column headers for the expanded detail sub-table */
  detailColumns: string[];
  /** Individual detail rows */
  details: string[][];
}

export interface ReportResult {
  title: string;
  kpis: ReportKPI[];
  columns: string[];
  rows: string[][];
  /** When present, renders an expandable grouped table instead of flat DataTable */
  groups?: ReportGroup[];
  chart?: ChartData;
  note?: string;
}

export interface SubReport {
  id: string;
  title: string;
  description: string;
  filterKeys: FilterKey[];
  IconComponent?: React.ElementType;
}

export interface ReportModule {
  id: string;
  title: string;
  subtitle: string;
  IconComponent: React.ElementType;
  color: string;
  roles: string[];
  subReports: SubReport[];
  /** IDs des sous-rapports visibles pour le rôle TECH uniquement (filtre côté UI) */
  techSubReportIds?: string[];
}

/** Roles autorisés — source unique : src/constants/roles.ts */
export { ALL_ROLES, FINANCE_ROLES } from '../../../constants/roles';

/** Groupes spécifiques aux rapports */
export const STAFF_ROLES = [
  'TECH',
  'COMMERCIAL',
  'COMPTABLE',
  'ADMIN',
  'SUPERADMIN',
  'MANAGER',
  'OPERATOR',
  'RESELLER',
];
export const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN'];

/** Helper: période → {start, end} */
export const getPeriodRange = (f: ReportFilters): { start: Date; end: Date } => {
  const now = new Date();
  if (f.period === 'custom' && f.customStart && f.customEnd) {
    return { start: new Date(f.customStart), end: new Date(f.customEnd + 'T23:59:59') };
  }
  if (f.period === '0') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  const days = parseInt(f.period, 10);
  return { start: new Date(Date.now() - days * 86400000), end: now };
};

/** Helper: période → libellé lisible (ex: "Du 01 janv. au 31 janv. 2026") */
export const formatPeriodLabel = (f: ReportFilters): string => {
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  if (f.period === '0') return "Aujourd'hui";
  if (f.period === 'custom' && f.customStart && f.customEnd) {
    return `Du ${fmt(new Date(f.customStart))} au ${fmt(new Date(f.customEnd))}`;
  }
  const { start, end } = getPeriodRange(f);
  return `Du ${fmt(start)} au ${fmt(end)}`;
};

/** Helpers format */
export const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtTime = (d: string) =>
  d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtNum = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
export const matchText = (v: string | undefined, f: string) => !f || (v ?? '').toLowerCase().includes(f.toLowerCase());
