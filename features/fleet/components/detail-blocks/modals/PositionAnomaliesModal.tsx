import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  MapPin,
  Check,
  X,
  Loader2,
  Zap,
  Gauge,
  Satellite,
  Clock,
  Navigation,
  Mountain,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '../../../../../i18n';
import { useDataContext } from '../../../../../contexts/DataContext';
import { useAuth } from '../../../../../contexts/AuthContext';
import type { PositionAnomaly, PositionAnomalyStatus, PositionAnomalyType } from '../../../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterRange = 'today' | 'week';

interface PositionAnomaliesModalProps {
  vehicleId: string;
  initialStatus?: PositionAnomalyStatus | 'ALL';
  initialRange?: FilterRange;
}

// ─── Styles par type d'anomalie ───────────────────────────────────────────────

function typeIcon(type: PositionAnomalyType) {
  switch (type) {
    case 'TELEPORT':
    case 'SPEED_IMPOSSIBLE':
      return Zap;
    case 'ALTITUDE_FAKE':
      return Mountain;
    case 'HDOP_HIGH':
      return Gauge;
    case 'SAT_LOW':
      return Satellite;
    case 'COORDS_ZERO':
      return MapPin;
    case 'STALE_TIMESTAMP':
      return Clock;
    case 'MULTI_SOURCE_MISMATCH':
      return Navigation;
    default:
      return AlertOctagon;
  }
}

function severityClasses(severity: string) {
  switch (severity) {
    case 'CRITICAL':
    case 'HIGH':
      return {
        border: 'border-[var(--clr-danger)]',
        bg: 'bg-[var(--clr-danger-dim)]',
        icon: 'text-[var(--clr-danger-strong)]',
      };
    case 'MEDIUM':
      return {
        border: 'border-[var(--clr-warning)]',
        bg: 'bg-[var(--clr-warning-dim)]',
        icon: 'text-[var(--clr-warning-strong)]',
      };
    default:
      return {
        border: 'border-[var(--clr-caution)]',
        bg: 'bg-[var(--clr-caution-dim)]',
        icon: 'text-[var(--clr-caution-strong)]',
      };
  }
}

function confidenceColor(confidence: number | null | undefined): string {
  if (confidence == null) return 'text-[var(--text-muted)]';
  if (confidence >= 80) return 'text-[var(--clr-success-strong)]';
  if (confidence >= 50) return 'text-[var(--clr-warning-strong)]';
  return 'text-[var(--clr-danger-strong)]';
}

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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

// ─── Détails par type (rendu contextuel du JSONB `details`) ──────────────────

function renderDetails(anomaly: PositionAnomaly, t: (k: string) => string): React.ReactNode {
  const d = (anomaly.details ?? {}) as Record<string, any>;
  switch (anomaly.type) {
    case 'TELEPORT':
    case 'SPEED_IMPOSSIBLE':
      return (
        <div className="text-[10px] text-[var(--text-secondary)] mt-1.5 space-y-0.5">
          {d.avg_speed_kmh != null && (
            <div>
              {t('fleet.detailPanel.positionAnomalies.details.avgSpeed')} : <b>{d.avg_speed_kmh} km/h</b>
              {d.threshold_kmh != null && <span className="text-[var(--text-muted)]"> (seuil {d.threshold_kmh})</span>}
            </div>
          )}
          {d.distance_m != null && (
            <div>
              {t('fleet.detailPanel.positionAnomalies.details.distance')} : <b>{d.distance_m} m</b>
              {d.dt_seconds != null && <span> en {d.dt_seconds} s</span>}
            </div>
          )}
        </div>
      );
    case 'ALTITUDE_FAKE':
      return (
        <div className="text-[10px] text-[var(--text-secondary)] mt-1.5">
          {d.reason === 'zero_constant'
            ? t('fleet.detailPanel.positionAnomalies.details.altitudeZero')
            : t('fleet.detailPanel.positionAnomalies.details.altitudeRepeated')}
          {Array.isArray(d.recent_sample) && d.recent_sample.length > 0 && (
            <span className="ml-2 font-mono text-[var(--text-muted)]">[{d.recent_sample.join(', ')}]</span>
          )}
        </div>
      );
    case 'HDOP_HIGH':
      return (
        <div className="text-[10px] text-[var(--text-secondary)] mt-1.5">
          HDOP : <b>{d.hdop}</b> (seuil {d.threshold})
        </div>
      );
    case 'SAT_LOW':
      return (
        <div className="text-[10px] text-[var(--text-secondary)] mt-1.5">
          {t('fleet.detailPanel.positionAnomalies.details.satellites')} : <b>{d.satellites ?? 0}</b>
          {d.min_required != null && <span> (min {d.min_required})</span>}
        </div>
      );
    case 'STALE_TIMESTAMP':
      return (
        <div className="text-[10px] text-[var(--text-secondary)] mt-1.5">
          {t('fleet.detailPanel.positionAnomalies.details.staleAge')} :{' '}
          <b>{d.age_ms != null ? Math.round(Number(d.age_ms) / 1000) : '?'} s</b>
        </div>
      );
    case 'COORDS_ZERO':
      return (
        <div className="text-[10px] text-[var(--text-secondary)] mt-1.5">
          {t('fleet.detailPanel.positionAnomalies.details.coordsZero')}
        </div>
      );
    default:
      return null;
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export const PositionAnomaliesModal: React.FC<PositionAnomaliesModalProps> = ({
  vehicleId,
  initialStatus = 'ALL',
  initialRange = 'today',
}) => {
  const { t, lang } = useTranslation();
  const { user } = useAuth();
  const { getPositionAnomalies, reviewPositionAnomaly } = useDataContext();
  const [statusFilter, setStatusFilter] = useState<PositionAnomalyStatus | 'ALL'>(initialStatus);
  const [rangeFilter, setRangeFilter] = useState<FilterRange>(initialRange);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const canReview = useMemo(() => {
    const role = (user?.role || '').toUpperCase();
    return !['CLIENT', 'SOUS_COMPTE', 'DRIVER'].includes(role);
  }, [user]);

  const { data: allAnomalies = [], isLoading } = useQuery({
    queryKey: ['positionAnomalies', vehicleId],
    queryFn: () => getPositionAnomalies(vehicleId, { limit: 200 }),
  });

  const filteredAnomalies = useMemo(() => {
    const start = rangeStart(rangeFilter);
    return allAnomalies.filter((a) => {
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
      if (new Date(a.time) < start) return false;
      return true;
    });
  }, [allAnomalies, statusFilter, rangeFilter]);

  const handleReview = (anomalyId: string, status: 'CONFIRMED' | 'DISMISSED') => {
    setPendingAction(`${anomalyId}-${status}`);
    reviewPositionAnomaly(anomalyId, status, {
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
          {filteredAnomalies.length === 0
            ? t('fleet.detailPanel.positionAnomalies.noAnomalies')
            : t('fleet.detailPanel.positionAnomalies.totalCount', { count: filteredAnomalies.length })}
        </span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PositionAnomalyStatus | 'ALL')}
          className="text-[11px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded px-2 py-1 text-[var(--text-primary)]"
        >
          <option value="ALL">{t('fleet.detailPanel.fuelEvents.filter.all')}</option>
          <option value="DETECTED">{t('fleet.detailPanel.positionAnomalies.status.DETECTED')}</option>
          <option value="CONFIRMED">{t('fleet.detailPanel.positionAnomalies.status.CONFIRMED')}</option>
          <option value="DISMISSED">{t('fleet.detailPanel.positionAnomalies.status.DISMISSED')}</option>
        </select>
      </div>

      {/* Empty state */}
      {filteredAnomalies.length === 0 && (
        <div className="text-xs text-[var(--text-muted)] italic p-4 text-center border border-dashed border-[var(--border)] rounded-lg">
          {t('fleet.detailPanel.positionAnomalies.empty')}
        </div>
      )}

      {/* Liste */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
        {filteredAnomalies.map((anomaly) => {
          const Icon = typeIcon(anomaly.type);
          const s = severityClasses(anomaly.severity);
          const isDetected = anomaly.status === 'DETECTED';
          const isPending = pendingAction?.startsWith(anomaly.id);

          return (
            <div key={anomaly.id} className={`p-3 rounded border-l-4 ${s.border} ${s.bg}`}>
              {/* Ligne 1 : type + severity + status + confidence */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${s.icon}`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {t(`fleet.detailPanel.positionAnomalies.type.${anomaly.type}`)}
                      </span>
                      {isDetected && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--clr-danger)] text-white tracking-wide">
                          {t('fleet.detailPanel.positionAnomalies.status.DETECTED')}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {formatDateTime(anomaly.time, locale)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className={`text-[10px] font-bold ${confidenceColor(anomaly.confidence)}`}>
                    {anomaly.confidence != null ? `${anomaly.confidence}%` : '—'}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] uppercase">
                    {t(`fleet.detailPanel.positionAnomalies.severity.${anomaly.severity}`)}
                  </span>
                </div>
              </div>

              {/* Détails contextuels par type */}
              {renderDetails(anomaly, t)}

              {/* Localisation */}
              {anomaly.latitude != null && anomaly.longitude != null && (
                <div className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate font-mono">
                    {Number(anomaly.latitude).toFixed(5)}, {Number(anomaly.longitude).toFixed(5)}
                  </span>
                </div>
              )}

              {/* Notes review */}
              {anomaly.notes && (
                <div className="text-[10px] text-[var(--text-secondary)] mt-1 italic">« {anomaly.notes} »</div>
              )}

              {/* Actions review */}
              {canReview && isDetected && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => handleReview(anomaly.id, 'CONFIRMED')}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-[var(--clr-danger)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    {t('fleet.detailPanel.fuelEvents.actions.confirm')}
                  </button>
                  <button
                    onClick={() => handleReview(anomaly.id, 'DISMISSED')}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border)] disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    {t('fleet.detailPanel.fuelEvents.actions.dismiss')}
                  </button>
                </div>
              )}

              {/* Status reviewed */}
              {!isDetected && (
                <div className="text-[10px] text-[var(--text-muted)] mt-1.5">
                  {t(`fleet.detailPanel.positionAnomalies.status.${anomaly.status}`)}
                  {anomaly.reviewed_at && ` · ${formatDateTime(anomaly.reviewed_at, locale)}`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
