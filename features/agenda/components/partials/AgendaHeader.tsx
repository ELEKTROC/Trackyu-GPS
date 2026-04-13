import React, { useState, useRef, useEffect } from 'react';
import { Plus, User, Search } from 'lucide-react';

interface AgendaHeaderProps {
  filter: 'ALL' | 'TECH' | 'BUSINESS';
  setFilter: (filter: 'ALL' | 'TECH' | 'BUSINESS') => void;
  onNewEvent: (type: 'TECH' | 'BUSINESS' | 'TASK') => void;
  agents: { id: string; name: string; role: string }[];
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const AgendaHeader: React.FC<AgendaHeaderProps> = ({
  filter,
  setFilter,
  onNewEvent,
  agents,
  selectedAgentId,
  setSelectedAgentId,
  searchQuery,
  setSearchQuery,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="shrink-0">
        <h2 className="text-xl sm:page-title">Agenda Unifié</h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] hidden sm:block">
          Planification des interventions et rendez-vous commerciaux
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
        {/* Barre de recherche — desktop uniquement */}
        <div className="relative hidden sm:block sm:flex-none">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full sm:min-w-[160px] pl-8 pr-3 py-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Filtre par type */}
        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'ALL' ? 'bg-[var(--bg-elevated)] shadow-sm text-[var(--primary)] dark:text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Tout
          </button>
          <button
            onClick={() => setFilter('TECH')}
            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'TECH' ? 'bg-[var(--bg-elevated)] shadow-sm text-[var(--primary)] dark:text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Tech
          </button>
          <button
            onClick={() => setFilter('BUSINESS')}
            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === 'BUSINESS' ? 'bg-[var(--bg-elevated)] shadow-sm text-[var(--primary)] dark:text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            Comm.
          </button>
        </div>

        {/* Filtre par agent — desktop only */}
        <div className="relative hidden sm:block">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="pl-8 pr-8 py-2 text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg appearance-none cursor-pointer focus:ring-2 focus:ring-[var(--primary)] min-w-[150px]"
          >
            <option value="ALL">Tous les agents</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.role === 'TECHNICIAN' ? '(Tech)' : agent.role === 'COMMERCIAL' ? '(Com)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Bouton Nouveau — dropdown click-based (fonctionne sur touch) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Nouveau</span>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl z-50 overflow-hidden">
              <button
                onClick={() => {
                  onNewEvent('TECH');
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border-b border-[var(--border)] border-[var(--border)]"
              >
                Intervention Technique
              </button>
              <button
                onClick={() => {
                  onNewEvent('BUSINESS');
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border-b border-[var(--border)] border-[var(--border)]"
              >
                Rendez-vous Commercial
              </button>
              <button
                onClick={() => {
                  onNewEvent('TASK');
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              >
                Tâche
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
