import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cpu, CheckCircle2, Clock, ArrowRightLeft, Loader2 } from 'lucide-react';
import { API_URL, getHeaders } from '../../../../services/api/client';

interface DeviceAssignment {
  id: string;
  imei: string;
  assigned_at: string;
  unassigned_at: string | null;
  assigned_by_name: string | null;
  unassigned_by_name: string | null;
  intervention_id: string | null;
  notes: string | null;
}

interface DeviceHistoryBlockProps {
  vehicleId: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function duration(from: string, to: string | null): string {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  if (days < 1) return '< 1 jour';
  if (days === 1) return '1 jour';
  return `${days} jours`;
}

async function fetchDeviceHistory(vehicleId: string): Promise<DeviceAssignment[]> {
  const response = await fetch(`${API_URL}/fleet/vehicles/${vehicleId}/device-history`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch device history');
  return response.json();
}

export const DeviceHistoryBlock: React.FC<DeviceHistoryBlockProps> = ({ vehicleId }) => {
  const {
    data: history = [],
    isLoading,
    isError,
  } = useQuery<DeviceAssignment[]>({
    queryKey: ['device-history', vehicleId],
    queryFn: () => fetchDeviceHistory(vehicleId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-3">
        <Loader2 className="w-3 h-3 animate-spin" />
        Chargement de l'historique…
      </div>
    );
  }

  if (isError) {
    return <p className="text-xs text-red-500 py-2">Impossible de charger l'historique des balises.</p>;
  }

  if (history.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] py-2 italic">Aucun historique de balise disponible.</p>;
  }

  return (
    <div className="space-y-2">
      {history.map((entry, idx) => {
        const isActive = entry.unassigned_at === null;
        return (
          <div
            key={entry.id}
            className={`relative pl-4 border-l-2 ${isActive ? 'border-emerald-400' : 'border-[var(--border)]'} pb-3`}
          >
            {/* Indicateur de statut */}
            <span
              className={`absolute -left-[7px] top-0.5 w-3 h-3 rounded-full border-2 ${
                isActive ? 'bg-emerald-400 border-white' : 'bg-[var(--border)] border-white'
              }`}
            />

            {/* IMEI + badge actif */}
            <div className="flex items-center gap-2 mb-0.5">
              <Cpu className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              <span className="font-mono text-xs font-semibold text-[var(--text-primary)] tracking-tight">
                {entry.imei}
              </span>
              {isActive && (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Actuelle
                </span>
              )}
              {idx === 0 && !isActive && (
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-full">
                  <ArrowRightLeft className="w-2.5 h-2.5" />
                  Remplacée
                </span>
              )}
            </div>

            {/* Dates */}
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-0.5">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              <span>
                {formatDate(entry.assigned_at)}
                {entry.unassigned_at ? ` → ${formatDate(entry.unassigned_at)}` : " → aujourd'hui"}
              </span>
              <span className="text-[var(--text-muted)]">·</span>
              <span className="font-medium text-[var(--text-secondary)]">
                {duration(entry.assigned_at, entry.unassigned_at)}
              </span>
            </div>

            {/* Notes */}
            {entry.notes && (
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 italic truncate" title={entry.notes}>
                {entry.notes}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
