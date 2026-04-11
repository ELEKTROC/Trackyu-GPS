import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronRight,
  Filter,
  Check,
  Play,
  CalendarClock,
  Eye,
  FileText,
  FileSpreadsheet,
  Download,
  LayoutList,
} from 'lucide-react';
import { REPORT_PERIODS } from '../../../constants';
import { ScheduleReportModal } from './ScheduleReportModal';

// ── Hierarchical vehicle/client filter ───────────────────────────────────────

interface HierarchicalFilterProps {
  clientVehicleMap: Map<string, Set<string>>;
  selectedVehicles: Set<string>;
  onChange: (newSelection: Set<string>) => void;
}

const HierarchicalFilter: React.FC<HierarchicalFilterProps> = ({ clientVehicleMap, selectedVehicles, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMap = useMemo(() => {
    if (!searchTerm) return clientVehicleMap;
    const q = searchTerm.toLowerCase();
    const newMap = new Map<string, Set<string>>();
    clientVehicleMap.forEach((vehicles, clientName) => {
      const clientMatches = clientName.toLowerCase().includes(q);
      const matching = new Set<string>();
      vehicles.forEach((v) => {
        if (clientMatches || v.toLowerCase().includes(q)) matching.add(v);
      });
      if (matching.size > 0) newMap.set(clientName, matching);
    });
    return newMap;
  }, [clientVehicleMap, searchTerm]);

  useEffect(() => {
    if (searchTerm) setExpandedClients(new Set(filteredMap.keys()));
  }, [searchTerm, filteredMap]);

  const totalSelected = selectedVehicles.size;
  const totalVehicles = useMemo(() => {
    let n = 0;
    clientVehicleMap.forEach((v) => (n += v.size));
    return n;
  }, [clientVehicleMap]);
  const hasFilter = totalSelected < totalVehicles;

  const handleClientCheckbox = (clientName: string, vehicles: Set<string>) => {
    const next = new Set(selectedVehicles);
    const list = Array.from(vehicles);
    if (list.every((v) => next.has(v))) list.forEach((v) => next.delete(v));
    else list.forEach((v) => next.add(v));
    onChange(next);
  };
  const handleVehicleCheckbox = (v: string) => {
    const next = new Set(selectedVehicles);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next);
  };
  const toggleClient = (c: string) => {
    const next = new Set(expandedClients);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setExpandedClients(next);
  };
  const selectAll = () => {
    const all = new Set<string>();
    clientVehicleMap.forEach((vs) => vs.forEach((v) => all.add(v)));
    onChange(all);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
          hasFilter || isOpen
            ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border-[var(--primary)] dark:border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)]'
            : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)] dark:hover:border-slate-600'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Véhicules{hasFilter ? ` (${totalSelected}/${totalVehicles})` : ''}</span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-80 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-xl z-50 flex flex-col max-h-96 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-[var(--border)] border-[var(--border)] space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Rechercher…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-[var(--border)] rounded-lg bg-transparent text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="flex justify-between text-xs">
              <button onClick={selectAll} className="text-[var(--primary)] dark:text-[var(--primary)] hover:underline">
                Tout sélectionner
              </button>
              <button
                onClick={() => onChange(new Set())}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-slate-300"
              >
                Tout désélectionner
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {Array.from(filteredMap.entries()).map(([clientName, vehicles]) => {
              const list = Array.from(vehicles);
              const cnt = list.filter((v) => selectedVehicles.has(v)).length;
              const allSel = cnt === list.length;
              const partial = cnt > 0 && !allSel;
              const expanded = expandedClients.has(clientName);
              return (
                <div
                  key={clientName}
                  className="border border-[var(--border)] border-[var(--border)]/50 rounded-lg overflow-hidden"
                >
                  <div className="flex items-center bg-[var(--bg-elevated)] p-2 hover:bg-[var(--bg-elevated)]/50 transition-colors">
                    <button
                      onClick={() => toggleClient(clientName)}
                      className="p-1 mr-1 rounded hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600"
                    >
                      {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    <div
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                      onClick={() => handleClientCheckbox(clientName, vehicles)}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allSel || partial ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border)] bg-[var(--bg-surface)]'}`}
                      >
                        {allSel && <Check className="w-3 h-3 text-white" />}
                        {partial && <div className="w-2 h-0.5 bg-white rounded-full" />}
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)] select-none">{clientName}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-auto">
                        {cnt}/{list.length}
                      </span>
                    </div>
                  </div>
                  {expanded && (
                    <div className="pl-9 pr-2 py-1 space-y-0.5 bg-[var(--bg-surface)] border-t border-[var(--border)] border-[var(--border)]/50">
                      {list.map((v) => (
                        <label key={v} className="flex items-center gap-2 py-1.5 px-1 rounded cursor-pointer tr-hover">
                          <input
                            type="checkbox"
                            checked={selectedVehicles.has(v)}
                            onChange={() => handleVehicleCheckbox(v)}
                            className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] w-3.5 h-3.5"
                          />
                          <span className="text-sm text-[var(--text-secondary)] truncate select-none">{v}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredMap.size === 0 && (
              <p className="text-center py-6 text-sm text-[var(--text-muted)]">Aucun résultat</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── ReportFilterBar ───────────────────────────────────────────────────────────

interface ReportFilterBarProps {
  period: string;
  onPeriodChange: (p: string) => void;
  clientVehicleMap?: Map<string, Set<string>>;
  selectedVehicles?: Set<string>;
  onSelectionChange?: (s: Set<string>) => void;
  onGenerate: (mode: 'view' | 'csv' | 'excel' | 'pdf') => void;
  // Sub-report type
  reports?: { id: string; label: string }[];
  selectedReport?: string;
  onReportChange?: (id: string) => void;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  period,
  onPeriodChange,
  clientVehicleMap,
  selectedVehicles,
  onSelectionChange,
  onGenerate,
  reports,
  selectedReport,
  onReportChange,
}) => {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const generateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (generateRef.current && !generateRef.current.contains(e.target as Node)) setIsGenerateOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selectedReportLabel = reports?.find((r) => r.id === selectedReport)?.label;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl shadow-sm">
      {/* Sub-report type dropdown */}
      {reports && reports.length > 0 && (
        <div className="relative">
          <div className="relative">
            <LayoutList className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            <select
              value={selectedReport}
              onChange={(e) => onReportChange?.(e.target.value)}
              className="pl-8 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer min-w-[160px]"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
          </div>
        </div>
      )}

      {/* Divider */}
      {reports && reports.length > 0 && <div className="w-px h-5 bg-slate-200 bg-[var(--bg-elevated)]" />}

      {/* Period */}
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="pl-8 pr-8 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none cursor-pointer"
        >
          {REPORT_PERIODS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
      </div>

      {/* Vehicle filter */}
      {clientVehicleMap && selectedVehicles && onSelectionChange && (
        <HierarchicalFilter
          clientVehicleMap={clientVehicleMap}
          selectedVehicles={selectedVehicles}
          onChange={onSelectionChange}
        />
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Schedule */}
      <button
        onClick={() => setIsScheduleOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 transition-colors text-sm font-medium"
      >
        <CalendarClock className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Programmer</span>
      </button>

      {/* Generate split button */}
      <div className="relative flex" ref={generateRef}>
        <button
          onClick={() => {
            onGenerate('view');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-l-lg transition-colors text-sm font-medium border-r border-[var(--primary)]"
        >
          <Play className="w-3.5 h-3.5" />
          Générer
        </button>
        <button
          onClick={() => setIsGenerateOpen(!isGenerateOpen)}
          className="flex items-center px-2 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-r-lg transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isGenerateOpen ? 'rotate-180' : ''}`} />
        </button>

        {isGenerateOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-[var(--bg-elevated)] rounded-xl shadow-xl border border-[var(--border)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                onGenerate('view');
                setIsGenerateOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 text-left"
            >
              <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Afficher
            </button>
            <div className="border-t border-[var(--border)] border-[var(--border)]" />
            <button
              onClick={() => {
                onGenerate('csv');
                setIsGenerateOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 text-left"
            >
              <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Exporter CSV
            </button>
            <button
              onClick={() => {
                onGenerate('excel');
                setIsGenerateOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 text-left"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Exporter Excel
            </button>
            <button
              onClick={() => {
                onGenerate('pdf');
                setIsGenerateOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-700 text-left"
            >
              <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Exporter PDF
            </button>
          </div>
        )}
      </div>

      <ScheduleReportModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSchedule={() => setIsScheduleOpen(false)}
      />
    </div>
  );
};
