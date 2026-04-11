import React, { useState, useCallback, useMemo } from 'react';
import type { Lead } from '../../../types/crm';
import { useDataContext } from '../../../contexts/DataContext';
import { useCurrency } from '../../../hooks/useCurrency';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { ArrowRight, X, Check, Calendar, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { MobileFilterSheet, FilterRadioRow, type MobileFilterTab } from '../../../components/MobileFilterSheet';

type LeadStatus = Lead['status'];

const ACTIVE_STAGES: {
  id: LeadStatus;
  label: string;
  color: string;
  bg: string;
  dotColor: string;
  ringColor: string;
}[] = [
  {
    id: 'NEW',
    label: 'Nouveaux',
    color: 'text-[var(--text-secondary)]',
    bg: 'bg-[var(--bg-elevated)]',
    dotColor: 'bg-slate-400',
    ringColor: 'ring-slate-400',
  },
  {
    id: 'CONTACTED',
    label: 'Contactés',
    color: 'text-[var(--primary)]',
    bg: 'bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]',
    dotColor: 'bg-[var(--primary-dim)]0',
    ringColor: 'ring-[var(--primary-dim)]',
  },
  {
    id: 'QUALIFIED',
    label: 'Qualifiés',
    color: 'text-violet-600',
    bg: 'bg-violet-50/50 dark:bg-violet-900/10',
    dotColor: 'bg-violet-500',
    ringColor: 'ring-violet-400',
  },
  {
    id: 'PROPOSAL',
    label: 'Proposition',
    color: 'text-amber-600',
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    dotColor: 'bg-amber-500',
    ringColor: 'ring-amber-400',
  },
  {
    id: 'NEGOTIATION',
    label: 'Négociation',
    color: 'text-orange-600',
    bg: 'bg-orange-50/50 dark:bg-orange-900/10',
    dotColor: 'bg-orange-500',
    ringColor: 'ring-orange-400',
  },
];

const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  NEW: 'CONTACTED',
  CONTACTED: 'QUALIFIED',
  QUALIFIED: 'PROPOSAL',
  PROPOSAL: 'NEGOTIATION',
  NEGOTIATION: 'WON',
};

export const PipelineView: React.FC = () => {
  const { leads, updateLeadStatus } = useDataContext();
  const { formatPrice } = useCurrency();
  const isMobile = useIsMobile();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStatus | null>(null);
  const [showLost, setShowLost] = useState(false);
  const [resellerFilter, setResellerFilter] = useState<string>('ALL');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const resellers = useMemo(() => {
    const map = new Map<string, string>();
    leads.forEach((l) => {
      if (l.tenantId && l.resellerName) map.set(l.tenantId, l.resellerName);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [leads]);

  const filteredLeads = useMemo(
    () => (resellerFilter === 'ALL' ? leads : leads.filter((l) => l.tenantId === resellerFilter)),
    [leads, resellerFilter]
  );

  const leadsByStage = useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = {
      NEW: [],
      CONTACTED: [],
      QUALIFIED: [],
      PROPOSAL: [],
      NEGOTIATION: [],
      WON: [],
      LOST: [],
    };
    for (const lead of filteredLeads) {
      const bucket = grouped[lead.status];
      if (bucket) bucket.push(lead);
    }
    return grouped;
  }, [filteredLeads]);

  const stageValues = useMemo(
    () =>
      Object.fromEntries(
        ACTIVE_STAGES.map((s) => [
          s.id,
          leadsByStage[s.id].reduce((sum, l) => sum + (l.estimatedValue || l.potentialValue || 0), 0),
        ])
      ) as Record<LeadStatus, number>,
    [leadsByStage]
  );

  const totalPipelineValue = useMemo(
    () => ACTIVE_STAGES.reduce((sum, s) => sum + (stageValues[s.id] || 0), 0),
    [stageValues]
  );

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: LeadStatus) => {
      e.preventDefault();
      if (draggedLeadId) updateLeadStatus(draggedLeadId, targetStatus);
      setDraggedLeadId(null);
      setDragOverStage(null);
    },
    [draggedLeadId, updateLeadStatus]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedLeadId(null);
    setDragOverStage(null);
  }, []);

  const getDays = (lead: Lead) => Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000);

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">
      {/* Header stats */}
      <div className="flex flex-wrap gap-2 text-xs items-center">
        <div className="flex items-center gap-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-lg px-3 py-1.5">
          <span className="font-semibold text-violet-700 dark:text-violet-300">Pipeline total</span>
          <span className="font-bold text-violet-600">{formatPrice(totalPipelineValue)}</span>
        </div>
        {/* Mobile filter button */}
        {isMobile && (
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)]"
          >
            <Building2 className="w-3.5 h-3.5" />
            Revendeur
            {resellerFilter !== 'ALL' && (
              <span className="absolute -top-1.5 -right-1.5 bg-[var(--primary-dim)]0 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                1
              </span>
            )}
          </button>
        )}
        {/* Desktop reseller filter */}
        {!isMobile && resellers.length > 1 && (
          <div className="relative">
            <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
            <select
              value={resellerFilter}
              onChange={(e) => setResellerFilter(e.target.value)}
              className="pl-7 pr-3 py-1.5 rounded-lg text-xs border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] appearance-none cursor-pointer"
            >
              <option value="ALL">Tous revendeurs</option>
              {resellers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {ACTIVE_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex items-center gap-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-1.5"
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.dotColor}`} />
            <span className={`font-semibold ${stage.color}`}>{stage.label}</span>
            <span className="font-bold text-[var(--text-primary)]">{leadsByStage[stage.id].length}</span>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 flex-1 overflow-x-auto min-h-0">
        {/* Active stage columns */}
        {ACTIVE_STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage[stage.id]}
            isDragOver={dragOverStage === stage.id}
            draggedLeadId={draggedLeadId}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDrop={(e) => handleDrop(e, stage.id)}
            onDragLeave={() => setDragOverStage(null)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onAdvance={(leadId) => {
              const next = NEXT_STATUS[stage.id];
              if (next) updateLeadStatus(leadId, next);
            }}
            onMarkLost={(leadId) => updateLeadStatus(leadId, 'LOST')}
            getDays={getDays}
            formatPrice={formatPrice}
          />
        ))}

        {/* WON column */}
        <div
          className={`
            flex flex-col min-w-[200px] w-[210px] flex-shrink-0 rounded-xl transition-all
            ${
              dragOverStage === 'WON'
                ? 'bg-green-50 dark:bg-green-900/20 ring-2 ring-green-400'
                : 'bg-green-50/30 dark:bg-green-900/10'
            }
          `}
          onDragOver={(e) => handleDragOver(e, 'WON')}
          onDrop={(e) => handleDrop(e, 'WON')}
          onDragLeave={() => setDragOverStage(null)}
        >
          <div className="px-3 py-2.5 border-b border-green-200 dark:border-green-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold uppercase text-green-600">Gagnés</span>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/40 rounded-full px-1.5 py-0.5">
              {leadsByStage.WON.length}
            </span>
          </div>
          <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
            {leadsByStage.WON.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isDragging={draggedLeadId === lead.id}
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onDragEnd={handleDragEnd}
                getDays={getDays}
                formatPrice={formatPrice}
                won
              />
            ))}
            {leadsByStage.WON.length === 0 && <DropZone accent="green" />}
          </div>
        </div>
      </div>

      {/* LOST section (collapsed) */}
      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm tr-hover transition-colors"
          onClick={() => setShowLost((v) => !v)}
        >
          <span className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-red-500 text-xs">Leads Perdus</span>
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full px-1.5 py-0.5 font-bold">
              {leadsByStage.LOST.length}
            </span>
          </span>
          {showLost ? (
            <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          )}
        </button>
        {showLost && (
          <div className="flex flex-wrap gap-2 p-3 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
            {leadsByStage.LOST.map((lead) => (
              <div
                key={lead.id}
                className="bg-[var(--bg-elevated)] border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 text-xs flex items-center gap-2"
              >
                <span className="font-semibold text-[var(--text-primary)]">{lead.companyName}</span>
                {lead.estimatedValue || lead.potentialValue ? (
                  <span className="text-red-500 font-medium">
                    {formatPrice(lead.estimatedValue || lead.potentialValue || 0)}
                  </span>
                ) : null}
              </div>
            ))}
            {leadsByStage.LOST.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] italic">Aucun lead perdu</p>
            )}
          </div>
        )}
      </div>

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        activeCount={resellerFilter !== 'ALL' ? 1 : 0}
        onReset={() => setResellerFilter('ALL')}
        tabs={
          [
            {
              id: 'reseller',
              label: 'Revendeur',
              activeCount: resellerFilter !== 'ALL' ? 1 : 0,
              content: (
                <>
                  <FilterRadioRow
                    value="ALL"
                    label="Tous"
                    checked={resellerFilter === 'ALL'}
                    onChange={() => setResellerFilter('ALL')}
                  />
                  {resellers.map((r) => (
                    <FilterRadioRow
                      key={r.id}
                      value={r.id}
                      label={r.name}
                      checked={resellerFilter === r.id}
                      onChange={() => setResellerFilter(r.id)}
                    />
                  ))}
                </>
              ),
            },
          ] as MobileFilterTab[]
        }
      />
    </div>
  );
};

// ─── Kanban Column ──────────────────────────────────────────────────────────

interface KanbanColumnProps {
  stage: (typeof ACTIVE_STAGES)[0];
  leads: Lead[];
  isDragOver: boolean;
  draggedLeadId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onAdvance: (id: string) => void;
  onMarkLost: (id: string) => void;
  getDays: (lead: Lead) => number;
  formatPrice: (v: number) => string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  leads,
  isDragOver,
  draggedLeadId,
  onDragOver,
  onDrop,
  onDragLeave,
  onDragStart,
  onDragEnd,
  onAdvance,
  onMarkLost,
  getDays,
  formatPrice,
}) => (
  <div
    className={`
      flex flex-col min-w-[200px] w-[210px] flex-shrink-0 rounded-xl transition-all
      ${isDragOver ? `${stage.bg} ring-2 ${stage.ringColor}` : stage.bg}
    `}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onDragLeave={onDragLeave}
  >
    <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.dotColor}`} />
        <span className={`text-xs font-bold uppercase ${stage.color}`}>{stage.label}</span>
      </div>
      <span className="text-xs font-bold text-[var(--text-secondary)] bg-slate-200 bg-[var(--bg-elevated)] rounded-full px-1.5 py-0.5">
        {leads.length}
      </span>
    </div>
    <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          isDragging={draggedLeadId === lead.id}
          onDragStart={(e) => onDragStart(e, lead.id)}
          onDragEnd={onDragEnd}
          onAdvance={() => onAdvance(lead.id)}
          onMarkLost={() => onMarkLost(lead.id)}
          getDays={getDays}
          formatPrice={formatPrice}
        />
      ))}
      {leads.length === 0 && <DropZone />}
    </div>
  </div>
);

// ─── Lead Card ───────────────────────────────────────────────────────────────

interface LeadCardProps {
  lead: Lead;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onAdvance?: () => void;
  onMarkLost?: () => void;
  getDays: (lead: Lead) => number;
  formatPrice: (v: number) => string;
  won?: boolean;
}

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  isDragging,
  onDragStart,
  onDragEnd,
  onAdvance,
  onMarkLost,
  getDays,
  formatPrice,
  won,
}) => {
  const days = getDays(lead);
  const isStale = !won && days > 14;
  const value = lead.estimatedValue || lead.potentialValue || 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`
        bg-[var(--bg-elevated)]/80 rounded-lg border p-2.5
        cursor-grab active:cursor-grabbing select-none
        transition-all duration-150
        ${isDragging ? 'opacity-40 scale-95 shadow-none' : 'shadow-sm hover:shadow-md hover:-translate-y-0.5'}
        ${isStale ? 'border-amber-300 dark:border-amber-600' : ''}
        ${won ? 'border-green-200 dark:border-green-700' : ''}
        ${!isStale && !won ? 'border-[var(--border)]' : ''}
      `}
    >
      <p className="text-xs font-bold text-[var(--text-primary)] truncate leading-tight">{lead.companyName}</p>
      {lead.contactName && (
        <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{lead.contactName}</p>
      )}
      {value > 0 && (
        <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 mt-1">{formatPrice(value)}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span
          className={`flex items-center gap-0.5 text-[10px] font-medium ${isStale ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}
        >
          <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
          {days}j{isStale && <span className="ml-0.5">⚠</span>}
        </span>

        <div className="flex items-center gap-0.5">
          {won ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <>
              {onMarkLost && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkLost();
                  }}
                  title="Marquer comme perdu"
                  className="p-0.5 rounded text-slate-300 dark:text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              {onAdvance && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvance();
                  }}
                  title="Avancer dans le pipeline"
                  className="p-0.5 rounded text-slate-300 dark:text-[var(--text-secondary)] hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Drop Zone placeholder ───────────────────────────────────────────────────

const DropZone: React.FC<{ accent?: string }> = ({ accent = 'slate' }) => (
  <div
    className={`
    text-center text-xs py-6 rounded-lg border-2 border-dashed
    text-${accent}-400 border-${accent}-200 dark:border-${accent}-800
  `}
  >
    Déposer ici
  </div>
);
