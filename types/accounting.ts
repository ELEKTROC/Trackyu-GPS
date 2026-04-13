export type PeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED';

export interface AccountingPeriod {
  id: string;
  tenantId: string;
  year: number;
  month: number;
  status: PeriodStatus;
  lockedAt?: string;
  lockedBy?: string;
  closedAt?: string;
  closedBy?: string;
  closureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeriodValidation {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  reason?: string;
  period?: AccountingPeriod;
}

export interface FiscalCalendar {
  tenantId: string;
  year: number;
  periods: AccountingPeriod[];
  openCount: number;
  closedCount: number;
  lockedCount: number;
}
