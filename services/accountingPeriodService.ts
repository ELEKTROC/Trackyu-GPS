/**
 * Service de gestion des périodes comptables (implémentation locale)
 * Sprint 2 - Task 5
 */

import type { AccountingPeriod, PeriodValidation, FiscalCalendar, PeriodStatus } from '../types/accounting';

// Store local (en attendant backend)
let localPeriods: AccountingPeriod[] = [];

// Pour les tests uniquement
export const __resetLocalPeriods = () => {
  localPeriods = [];
};
export const __setLocalPeriods = (periods: AccountingPeriod[]) => {
  localPeriods = periods;
};

const generateId = (): string => `PERIOD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const now = (): string => new Date().toISOString();

/** Initialise les 12 périodes d'une année pour un tenant (idempotent) */
export const initializeAccountingPeriods = (tenantId: string, year: number): AccountingPeriod[] => {
  const existing = localPeriods.filter((p) => p.tenantId === tenantId && p.year === year);
  if (existing.length === 12) return existing;

  const created: AccountingPeriod[] = [];
  for (let month = 1; month <= 12; month++) {
    const exists = localPeriods.find((p) => p.tenantId === tenantId && p.year === year && p.month === month);
    if (!exists) {
      const period: AccountingPeriod = {
        id: generateId(),
        tenantId,
        year,
        month,
        status: 'OPEN',
        createdAt: now(),
        updatedAt: now(),
      };
      localPeriods.push(period);
      created.push(period);
    } else {
      created.push(exists);
    }
  }
  return localPeriods.filter((p) => p.tenantId === tenantId && p.year === year).sort((a, b) => a.month - b.month);
};

/** Retourne toutes les périodes d'un tenant */
export const getAccountingPeriods = async (tenantId: string): Promise<AccountingPeriod[]> => {
  return localPeriods
    .filter((p) => p.tenantId === tenantId)
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
};

/** Retourne une période par son ID */
export const getAccountingPeriod = async (id: string): Promise<AccountingPeriod | null> => {
  return localPeriods.find((p) => p.id === id) ?? null;
};

/** Retourne la période correspondant à une date ISO */
export const getPeriodForDate = async (tenantId: string, date: string): Promise<AccountingPeriod | null> => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return localPeriods.find((p) => p.tenantId === tenantId && p.year === year && p.month === month) ?? null;
};

/** Valide si une opération est autorisée sur une date */
export const validatePeriodOperation = async (
  tenantId: string,
  date: string,
  operation: 'create' | 'edit' | 'delete'
): Promise<PeriodValidation> => {
  const period = await getPeriodForDate(tenantId, date);

  if (!period) {
    return { canCreate: true, canEdit: true, canDelete: true };
  }

  if (period.status === 'LOCKED') {
    return {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      reason: `La période ${period.month}/${period.year} est verrouillée`,
      period,
    };
  }

  if (period.status === 'CLOSED') {
    return {
      canCreate: false,
      canEdit: operation !== 'create',
      canDelete: false,
      reason: `La période ${period.month}/${period.year} est clôturée`,
      period,
    };
  }

  return { canCreate: true, canEdit: true, canDelete: true, period };
};

interface LockAction {
  periodId: string;
  action: 'close' | 'lock' | 'reopen';
  reason?: string;
}

/** Gère le cycle de vie d'une période (clôture / verrouillage / réouverture) */
export const managePeriodLock = async (
  _tenantId: string,
  lockAction: LockAction,
  userId: string,
  userName: string
): Promise<{ success: boolean; period?: AccountingPeriod; error?: string }> => {
  const index = localPeriods.findIndex((p) => p.id === lockAction.periodId);
  if (index === -1) return { success: false, error: 'Période introuvable' };

  const period = { ...localPeriods[index] };

  if (lockAction.action === 'close') {
    if (period.status !== 'OPEN') return { success: false, error: 'Seule une période OPEN peut être clôturée' };
    period.status = 'CLOSED' as PeriodStatus;
    period.closedAt = now();
    period.closedBy = `${userId} (${userName})`;
    period.closureReason = lockAction.reason;
  } else if (lockAction.action === 'lock') {
    if (period.status === 'LOCKED') return { success: false, error: 'Période déjà verrouillée' };
    period.status = 'LOCKED' as PeriodStatus;
    period.lockedAt = now();
    period.lockedBy = `${userId} (${userName})`;
  } else if (lockAction.action === 'reopen') {
    if (period.status === 'LOCKED')
      return { success: false, error: 'Une période verrouillée ne peut pas être réouverte' };
    period.status = 'OPEN' as PeriodStatus;
    period.closedAt = undefined;
    period.closedBy = undefined;
  }

  period.updatedAt = now();
  localPeriods[index] = period;

  return { success: true, period };
};

/** Retourne le calendrier fiscal d'une année */
export const getFiscalCalendar = async (tenantId: string, year?: number): Promise<FiscalCalendar> => {
  const targetYear = year ?? new Date().getFullYear();
  initializeAccountingPeriods(tenantId, targetYear);
  const periods = localPeriods
    .filter((p) => p.tenantId === tenantId && p.year === targetYear)
    .sort((a, b) => a.month - b.month);

  return {
    tenantId,
    year: targetYear,
    periods,
    openCount: periods.filter((p) => p.status === 'OPEN').length,
    closedCount: periods.filter((p) => p.status === 'CLOSED').length,
    lockedCount: periods.filter((p) => p.status === 'LOCKED').length,
  };
};

/** Vérifie avant saisie d'une écriture */
export const checkPeriodBeforeEntry = async (
  tenantId: string,
  date: string
): Promise<{ allowed: boolean; message?: string }> => {
  const validation = await validatePeriodOperation(tenantId, date, 'create');
  if (!validation.canCreate) {
    return { allowed: false, message: validation.reason };
  }
  return { allowed: true };
};
