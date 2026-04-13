import React from 'react';
import type { Lead } from '../../../types';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import {
  Users,
  TrendingUp,
  FileText,
  CheckCircle,
  Edit,
  Trash2,
  Calendar,
  Phone,
  Handshake,
  XCircle,
} from 'lucide-react';

interface LeadsKanbanProps {
  leads: Lead[];
  searchTerm: string;
  selectedCompany: string;
  filters?: any;
  tasks?: any[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onDeleteLead: (id: string) => void;
  onEditLead: (lead: Lead) => void;
  onConvertToClient: (lead: Lead) => void;
}

const KANBAN_COLUMNS = [
  {
    id: 'NEW',
    title: 'Nouveau Lead',
    color: 'bg-[var(--bg-elevated)]/50',
    borderColor: 'border-[var(--border)]',
    headerColor: 'border-t-slate-400',
    icon: Users,
  },
  {
    id: 'CONTACTED',
    title: 'Contacté',
    color: 'bg-cyan-50/50 dark:bg-cyan-900/10',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    headerColor: 'border-t-cyan-500',
    icon: Phone,
  },
  {
    id: 'QUALIFIED',
    title: 'Qualifié',
    color: 'bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]',
    borderColor: 'border-[var(--border)] dark:border-[var(--primary)]',
    headerColor: 'border-t-blue-500',
    icon: TrendingUp,
  },
  {
    id: 'PROPOSAL',
    title: 'Proposition',
    color: 'bg-purple-50/50 dark:bg-purple-900/10',
    borderColor: 'border-[var(--clr-info-border)]',
    headerColor: 'border-t-purple-500',
    icon: FileText,
  },
  {
    id: 'NEGOTIATION',
    title: 'Négociation',
    color: 'bg-amber-50/50 dark:bg-amber-900/10',
    borderColor: 'border-[var(--clr-caution-border)]',
    headerColor: 'border-t-amber-500',
    icon: Handshake,
  },
  {
    id: 'WON',
    title: 'Gagné',
    color: 'bg-green-50/50 dark:bg-green-900/10',
    borderColor: 'border-[var(--clr-success-border)]',
    headerColor: 'border-t-green-500',
    icon: CheckCircle,
  },
  {
    id: 'LOST',
    title: 'Perdu',
    color: 'bg-red-50/50 dark:bg-red-900/10',
    borderColor: 'border-[var(--clr-danger-border)]',
    headerColor: 'border-t-red-500',
    icon: XCircle,
  },
];

export const LeadsKanban: React.FC<LeadsKanbanProps> = ({
  leads,
  searchTerm,
  selectedCompany,
  filters,
  tasks = [],
  onDragStart,
  onDragOver,
  onDrop,
  onDeleteLead,
  onEditLead,
  onConvertToClient,
}) => {
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  return (
    <>
      <div className="flex-1 overflow-x-auto custom-scrollbar pb-4">
        <div className="flex gap-6 h-full min-w-[1200px]">
          {KANBAN_COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => {
              const matchesStatus = l.status === col.id;
              const matchesSearch =
                (l.companyName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (l.contactName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
              const matchesCompany = selectedCompany === 'all' || l.companyName === selectedCompany;
              const matchesReseller = !filters || filters.reseller === 'ALL' || l.resellerId === filters.reseller;
              const matchesAssigned = !filters || filters.assignedTo === 'ALL' || l.assignedTo === filters.assignedTo;

              return matchesStatus && matchesSearch && matchesCompany && matchesReseller && matchesAssigned;
            });
            return (
              <div
                key={col.id}
                className={`flex-1 flex flex-col rounded-xl border ${col.borderColor} ${col.color} min-w-[300px] transition-colors duration-300`}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.id)}
              >
                <div
                  className={`p-4 rounded-t-xl bg-[var(--bg-elevated)] border-b border-[var(--border)] border-[var(--border)] border-t-4 ${col.headerColor} shadow-sm z-10`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                      <col.icon className="w-4 h-4 text-[var(--text-muted)]" /> {col.title}
                    </div>
                    <span className="bg-[var(--bg-elevated)] px-2 py-1 rounded-md text-xs font-bold text-[var(--text-secondary)]">
                      {colLeads.length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, lead.id)}
                      className="bg-[var(--bg-elevated)] p-4 rounded-xl shadow-sm border border-[var(--border)] cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-1 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[var(--border)] border-[var(--border)]">
                          {(lead.potentialValue ?? 0).toLocaleString('fr-FR')}
                        </span>
                        <div className="flex gap-1">
                          {lead.status === 'WON' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onConvertToClient(lead);
                              }}
                              className="text-[var(--text-muted)] hover:text-green-600 dark:hover:text-green-400"
                              title="Convertir en Client"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditLead(lead);
                            }}
                            className="text-[var(--text-muted)] hover:text-[var(--primary)] dark:hover:text-[var(--primary)]"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (
                                await confirm({
                                  message: 'Supprimer ce lead ?',
                                  variant: 'danger',
                                  title: 'Confirmer la suppression',
                                  confirmLabel: 'Supprimer',
                                })
                              )
                                onDeleteLead(lead.id);
                            }}
                            className="text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-[var(--text-primary)] text-sm">{lead.companyName}</h4>
                        {tasks.some((t) => t.relatedTo?.id === lead.id && t.status !== 'DONE') && (
                          <span className="flex h-2 w-2 relative" title="Tâches en attente">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary-dim)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary-dim)]0"></span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mb-1">{lead.contactName}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('fr-FR') : '-'}
                        </p>
                        <span className="text-[10px] font-bold text-[var(--primary)] dark:text-[var(--primary)]">
                          {lead.resellerName || 'Global'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ConfirmDialogComponent />
    </>
  );
};
