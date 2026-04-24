import React, { useMemo, useState } from 'react';
import { Fuel, AlertOctagon, TrendingDown, AlertTriangle, MapPin, Check, X, HelpCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../../../../../i18n';
import { useDataContext } from '../../../../../contexts/DataContext';
import { useAuth } from '../../../../../contexts/AuthContext';
import type { FuelEventStatus, FuelEventType } from '../../../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterRange = 'today' | 'week';

interface FuelEventsModalProps {
  vehicleId: string;
  initialType?: 'REFILL' | 'THEFT';
  initialRange?: FilterRange;
  initialStatus?: FuelEventStatus | 'ALL';
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function typeIcon(type: FuelEventType) {
  switch (type) {
    case 'REFILL':
      return Fuel;
    case 'THEFT':
      return AlertOctagon;
    case 'CONSUMPTION':
      return TrendingDown;
    case 'ANOMALY':
    default:
      return AlertTriangle;
  }
}

function severityClasses(severity: string, type: FuelEventType) {
  if (type === 'THEFT' && (severity === 'HIGH' || severity === 'CRITICAL')) {
    return {
      border: 'border-[var(--clr-danger)]',
      bg: 'bg-[var(--clr-danger-dim)]',
      icon: 'text-[var(--clr-danger-strong)]',
    };
  }
  if (type === 'THEFT') {
    return {
      border: 'border-[var(--clr-warning)]',
      bg: 'bg-[var(--clr-warning-dim)]',
      icon: 'text-[var(--clr-warning-strong)]',
    };
  }
  if (type === 'REFILL') {
    return {
      border: 'border-[var(--clr-success)]',
      bg: 'bg-[var(--clr-success-dim)]',
      icon: 'text-[var(--clr-success-strong)]',
    };
  }
  return {
    border: 'border-[var(--clr-caution)]',
    bg: 'bg-[var(--clr-caution-dim)]',
    icon: 'text-[var(--clr-caution-strong)]',
  };
}

function confidenceColor(confidence: number): string {
  if (confidence >= 90) return 'text-[var(--clr-danger-strong)]';
  if (confidence >= 75) return 'text-[var(--clr-warning-strong)]';
  return 'text-[var(--text-muted)]';
}

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function rangeStart(range: FilterRange): Date {
  const d = new Date();
  if (range === 'today') {
    d.setHours(0, 0, 0, 0);
  } else {
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export const FuelEventsModal: React.FC<FuelEventsModalProps> = ({
  vehicleId,
  initialType = 'THEFT',
  initialRange = 'today',
  initialStatus = 'ALL',
}) => {
  const { t, lang } = useTranslation();
  const { user } = useAuth();
  const { getFuelEvents, reviewFuelEvent } = useDataContext();
  const [typeFilter, setTypeFilter] = useState<'REFILL' | 'THEFT'>(initialType);
  const [rangeFilter, setRangeFilter] = useState<FilterRange>(initialRange);
  const [statusFilter, setStatusFilter] = useState<FuelEventStatus | 'ALL'>(initialStatus);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const canReview = useMemo(() => {
    const role = (user?.role || '').toUpperCase();
    return !['CLIENT', 'SOUS_COMPTE', 'DRIVER'].includes(role);
  }, [user]);

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ['fuelEvents', vehicleId],
    queryFn: () => getFuelEvents(vehicleId, { limit: 200 }),
  });

  const filteredEvents = useMemo(() => {
    const start = rangeStart(rangeFilter);
    return allEvents.filter((e) => {
      if (e.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (new Date(e.start_time) < start) return false;
      return true;
    });
  }, [allEvents, typeFilter, rangeFilter, statusFilter]);

  const handleReview = (eventId: string, status: 'CONFIRMED' | 'DISMISSED' | 'DISPUTED') => {
    setPendingAction(`${eventId}-${status}`);
    reviewFuelEvent(eventId, status, {
      vehicleId,
      onSuccess: () => setPendingAction(null),
      onError: () => setPendingAction(null),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center text-xs text-[var(--text-muted)]">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  const locale = lang || 'fr';

  return (
    <div className="p-5 space-y-4">
      {/* Toggle type */}
      <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg">
        <button
          onClick={() => setTypeFilter('REFILL')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === 'REFILL'
              ? 'bg-[var(--bg-card)] text-[var(--clr-success-strong)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Fuel className="w-3.5 h-3.5" />
          {t('fleet.detailPanel.fuelEvents.type.REFILL')}
        </button>
        <button
          onClick={() => setTypeFilter('THEFT')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${
            typeFilter === 'THEFT'
              ? 'bg-[var(--bg-card)] text-[var(--clr-danger-strong)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          {t('fleet.detailPanel.fuelEvents.type.THEFT')}
        </button>
      </div>

      {/* Toggle plage */}
      <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg">
        <button
          onClick={() => setRangeFilter('today')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            rangeFilter === 'today'
              ? 'bg-[var(--bg-card)] text-[var(--primary)] shadow-sm'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          {t('fleet.detailPanel.fuelEvents.range.today')}
        </button>
        <button
          onClick={() => setRangeFilter('week')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
            rangeFilter === 'week'
              ? 'bg-[var(--bg-card)] text-[var(--primary)] shadow-sm'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          {t('fleet.detailPanel.fuelEvents.range.week')}
        </button>
      </div>

      {/* Filtre statut */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--text-secondary)]">
          {filteredEvents.length === 0
            ? t('fleet.detailPanel.fuelEvents.noEvents')
            : t('fleet.detailPanel.fuelEvents.totalCount', { count: filteredEvents.length })}
        </span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FuelEventStatus | 'ALL')}
          className="text-[11px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)]"
        >
          <option value="ALL">{t('fleet.detailPanel.fuelEvents.filter.all')}</option>
          <option value="NEW">{t('fleet.detailPanel.fuelEvents.status.NEW')}</option>
          <option value="CONFIRMED">{t('fleet.detailPanel.fuelEvents.status.CONFIRMED')}</option>
          <option value="DISMISSED">{t('fleet.detailPanel.fuelEvents.status.DISMISSED')}</option>
          <option value="DISPUTED">{t('fleet.detailPanel.fuelEvents.status.DISPUTED')}</option>
        </select>
      </div>

      {/* Empty state */}
      {filteredEvents.length === 0 && (
        <div className="text-xs text-[var(--text-muted)] italic p-4 text-center border border-dashed border-[var(--border)] rounded-lg">
          {t('fleet.detailPanel.fuelEvents.empty')}
        </div>
      )}

      {/* Liste */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredEvents.map((event) => {
          const Icon = typeIcon(event.type);
          const s = severityClasses(event.severity, event.type);
          const isNew = event.status === 'NEW';
          const isPending = pendingAction?.startsWith(event.id);

          return (
            <div key={event.id} className={`p-3 rounded border-l-4 ${s.border} ${s.bg}`}>
              {/* Ligne 1 : type + delta + status + severity */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.icon}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {t(`fleet.detailPanel.fuelEvents.type.${event.type}`)}
                      </span>
                      <span className={`text-xs font-bold ${s.icon}`}>
                        {event.delta_liters > 0 ? '+' : ''}
                        {Math.round(event.delta_liters * 10) / 10} L
                      </span>
                      {isNew && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--clr-danger)] text-white tracking-wide">
                          {t('fleet.detailPanel.fuelEvents.status.NEW')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {formatDateTime(event.start_time, locale)}
                      {event.duration_seconds > 0 && (
                        <span className="mx-1">· {formatDuration(event.duration_seconds)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className={`text-[10px] font-bold ${confidenceColor(event.confidence)}`}>
                    {event.confidence}%
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] uppercase">
                    {t(`fleet.detailPanel.fuelEvents.severity.${event.severity}`)}
                  </span>
                </div>
              </div>

              {/* Ligne 2 : before → after + contexte */}
              {event.before_liters !== null && event.after_liters !== null && (
                <div className="text-[10px] text-[var(--text-secondary)] mt-1.5">
                  {Math.round((event.before_liters ?? 0) * 10) / 10} L →{' '}
                  {Math.round((event.after_liters ?? 0) * 10) / 10} L
                  {event.tank_capacity
                    ? ` ${t('fleet.detailPanel.fuelEvents.tankSize', { size: Number(event.tank_capacity) })}`
                    : ''}
                  {event.max_speed !== null && event.max_speed !== undefined && (
                    <span className="ml-2">
                      · {t('fleet.detailPanel.fuelEvents.maxSpeed', { speed: Math.round(Number(event.max_speed)) })}
                    </span>
                  )}
                  {event.acc_during !== null && (
                    <span className="ml-2">
                      ·{' '}
                      {event.acc_during
                        ? t('fleet.detailPanel.fuelEvents.accOn')
                        : t('fleet.detailPanel.fuelEvents.accOff')}
                    </span>
                  )}
                </div>
              )}

              {/* Ligne 3 : localisation */}
              {event.start_lat != null && event.start_lng != null && (
                <div className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {event.start_address ||
                      `${Number(event.start_lat).toFixed(4)}, ${Number(event.start_lng).toFixed(4)}`}
                  </span>
                </div>
              )}

              {/* Notes review */}
              {event.notes && (
                <div className="text-[10px] text-[var(--text-secondary)] mt-1 italic">« {event.notes} »</div>
              )}

              {/* Actions review */}
              {canReview && isNew && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => handleReview(event.id, 'CONFIRMED')}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-[var(--clr-danger)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    {t('fleet.detailPanel.fuelEvents.actions.confirm')}
                  </button>
                  <button
                    onClick={() => handleReview(event.id, 'DISMISSED')}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)] disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    {t('fleet.detailPanel.fuelEvents.actions.dismiss')}
                  </button>
                  <button
                    onClick={() => handleReview(event.id, 'DISPUTED')}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)] disabled:opacity-50"
                  >
                    <HelpCircle className="w-3 h-3" />
                    {t('fleet.detailPanel.fuelEvents.actions.dispute')}
                  </button>
                </div>
              )}

              {/* Status reviewed */}
              {!isNew && (
                <div className="text-[10px] text-[var(--text-muted)] mt-1.5">
                  {t(`fleet.detailPanel.fuelEvents.status.${event.status}`)}
                  {event.reviewed_at && ` · ${formatDateTime(event.reviewed_at, locale)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
