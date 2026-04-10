
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, ArrowRight, Command, LayoutDashboard, Map, Truck,
  FileText, Users, DollarSign, Wrench, Package, Headset,
  ShieldCheck, Plus, LogOut, X, Smartphone
} from 'lucide-react';
import type { Vehicle} from '../types';
import { View } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  onNavigate: (view: View) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onAction: (actionId: string) => void;
}

type ResultType = 'NAVIGATION' | 'VEHICLE' | 'ACTION';

interface SearchResult {
  id: string;
  type: ResultType;
  label: string;
  subLabel?: string;
  icon: React.ElementType;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen, onClose, vehicles, onNavigate, onSelectVehicle, onAction
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Define standard actions and navigation items
  const staticItems: SearchResult[] = useMemo(() => [
    // Navigation
    { id: 'nav-dash', type: 'NAVIGATION', label: 'Tableau de bord', icon: LayoutDashboard, action: () => onNavigate(View.DASHBOARD) },
    { id: 'nav-map', type: 'NAVIGATION', label: 'Carte en temps réel', icon: Map, action: () => onNavigate(View.MAP) },
    { id: 'nav-fleet', type: 'NAVIGATION', label: 'Gestion de Flotte', icon: Truck, action: () => onNavigate(View.FLEET) },

    { id: 'nav-crm', type: 'NAVIGATION', label: 'Prévente & CRM', icon: Users, action: () => onNavigate(View.PRESALES) },
    { id: 'nav-sales', type: 'NAVIGATION', label: 'Vente & Clients', icon: DollarSign, action: () => onNavigate(View.SALES) },

    { id: 'nav-tech', type: 'NAVIGATION', label: 'Interventions Tech', icon: Wrench, action: () => onNavigate(View.TECH) },
    { id: 'nav-stock', type: 'NAVIGATION', label: 'Stock & Matériel', icon: Package, action: () => onNavigate(View.STOCK) },
    { id: 'nav-supp', type: 'NAVIGATION', label: 'Support Client', icon: Headset, action: () => onNavigate(View.SUPPORT) },
    { id: 'nav-rep', type: 'NAVIGATION', label: 'Rapports', icon: FileText, action: () => onNavigate(View.REPORTS) },
    { id: 'nav-admin', type: 'NAVIGATION', label: 'Administration', icon: ShieldCheck, action: () => onNavigate(View.ADMIN) },

    // Global Actions
    { id: 'act-ticket', type: 'ACTION', label: 'Créer un ticket', icon: Plus, subLabel: 'Support', action: () => onAction('CREATE_TICKET') },
    { id: 'act-lead', type: 'ACTION', label: 'Ajouter un lead', icon: Plus, subLabel: 'CRM', action: () => onAction('CREATE_LEAD') },
    { id: 'act-inv', type: 'ACTION', label: 'Nouvelle facture', icon: Plus, subLabel: 'Finance', action: () => onAction('CREATE_INVOICE') },
    { id: 'act-logout', type: 'ACTION', label: 'Déconnexion', icon: LogOut, action: () => onAction('LOGOUT') },
  ], [onNavigate, onAction]);

  // Filter logic
  const results: SearchResult[] = useMemo(() => {
    if (!query) return staticItems.slice(0, 5); // Show top nav by default

    const lowerQuery = query.toLowerCase();

    // 1. Filter Static Items
    const matchedStatic = staticItems.filter(item =>
      item.label.toLowerCase().includes(lowerQuery) ||
      item.subLabel?.toLowerCase().includes(lowerQuery)
    );

    // 2. Filter Vehicles (Dynamic)
    const matchedVehicles: SearchResult[] = vehicles
      .filter(v =>
        v.name.toLowerCase().includes(lowerQuery) ||
        v.id.toLowerCase().includes(lowerQuery) ||
        v.driver.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5) // Limit vehicle results
      .map(v => ({
        id: `veh-${v.id}`,
        type: 'VEHICLE',
        label: v.name,
        subLabel: `${v.id} • ${v.driver}`,
        icon: v.id.includes('TRK') ? Truck : Smartphone, // Simplified icon logic
        action: () => onSelectVehicle(v)
      }));

    return [...matchedStatic, ...matchedVehicles];
  }, [query, staticItems, vehicles, onSelectVehicle]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            results[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-[var(--bg-surface)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-[var(--border)]">
        {/* Header / Search */}
        <div className="flex items-center px-4 py-4 border-b border-[var(--border)]">
          <Search className="w-5 h-5 mr-3" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Tapez une commande ou recherchez..."
            value={query}
            onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2 py-1 rounded border bg-[var(--bg-elevated)] border-[var(--border)]"
              style={{ color: 'var(--text-muted)' }}
            >ESC</span>
            <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2 space-y-1"
        >
          {results.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
               <Command className="w-12 h-12 mx-auto mb-3 opacity-20" />
               <p>Aucun résultat trouvé pour "{query}"</p>
            </div>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-left group ${
                    isSelected ? 'shadow-md' : 'hover:bg-[var(--bg-elevated)]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--primary)' : undefined,
                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                    }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">
                      {item.label}
                    </p>
                    {item.subLabel && (
                      <p className="text-xs truncate" style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)' }}>
                        {item.subLabel}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <ArrowRight className="w-4 h-4 opacity-80" />
                  )}
                  {/* Category Badge (Only if querying) */}
                  {query && !isSelected && (
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-1 rounded border bg-[var(--bg-elevated)] border-[var(--border)]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {item.type === 'NAVIGATION' ? 'Aller à' : item.type === 'VEHICLE' ? 'Véhicule' : 'Action'}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Tips */}
        <div className="bg-[var(--bg-elevated)] border-t border-[var(--border)] px-4 py-2 flex justify-between items-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <div className="flex gap-4">
            <span><strong style={{ color: 'var(--text-secondary)' }}>↑↓</strong> naviguer</span>
            <span><strong style={{ color: 'var(--text-secondary)' }}>↵</strong> valider</span>
          </div>
          <div>
            FleetCommand AI <span className="font-mono">v2.4.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
