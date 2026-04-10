import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { TierForm } from './TierForm';
import { TierList } from './TierList';
import type { Tier, TierType } from '../../../types';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { 
  Search, Plus, Filter, LayoutTemplate, Download, Upload, FileSpreadsheet, Check,
  Users, UserCheck, UserX, Briefcase
} from 'lucide-react';
import { TierDetailModal } from './TierDetailModal';
import { useDateRange } from '../../../hooks/useDateRange';
import { DateRangeSelector } from '../../../components/DateRangeSelector';
import { logger } from '../../../utils/logger';

export const TiersView: React.FC<{ onNavigate?: any, dateRange?: { start: string; end: string } }> = ({ onNavigate, dateRange: externalDateRange }) => {
  const isMobile = useIsMobile();
  const { tiers, addTier, updateTier } = useDataContext();
  const { showToast } = useToast();
  
  // --- DATE LOGIC ---
  const { 
      periodPreset, 
      setPeriodPreset, 
      customDateRange, 
      setCustomDateRange, 
      dateRange: internalDateRange 
  } = useDateRange();

  const dateRange = externalDateRange || internalDateRange;

  const filteredTiers = useMemo(() => {
      if (!dateRange) return tiers;
      return tiers.filter(t => {
          const date = new Date(t.createdAt).toISOString().split('T')[0];
          return date >= dateRange.start && date <= dateRange.end;
      });
  }, [tiers, dateRange]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TierType | 'ALL'>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | undefined>(undefined);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // --- KPIs Calculation ---
  const kpis = useMemo(() => {
    const totalClients = filteredTiers.filter(t => t.type === 'CLIENT').length;
    const activeClients = filteredTiers.filter(t => t.type === 'CLIENT' && t.status === 'ACTIVE').length;
    const resellers = filteredTiers.filter(t => t.type === 'RESELLER').length;
    const suppliers = filteredTiers.filter(t => t.type === 'SUPPLIER').length;
    
    // New clients this month (mock logic based on createdAt if available, else random for demo)
    // In real app, use t.createdAt
    const newClients = filteredTiers.filter(t => t.type === 'CLIENT' && new Date(t.createdAt).getMonth() === new Date().getMonth()).length;

    return {
      totalClients,
      activeClients,
      resellers,
      suppliers,
      newClients
    };
  }, [filteredTiers]);

  // UI States

  // UI States
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // Create filter function based on activeFilters
  const getFilterFunction = useMemo(() => {
    if (activeFilters.length === 0) return undefined;
    return (tier: Tier) => {
      for (const filter of activeFilters) {
        switch (filter) {
          case 'OVERDUE':
            // Tiers with negative balance (unpaid invoices)
            if (tier.type === 'CLIENT' && (tier.clientData?.balance || 0) >= 0) return false;
            if (tier.type === 'SUPPLIER' && (tier.supplierData?.balance || 0) >= 0) return false;
            break;
          case 'INACTIVE':
            if (tier.status !== 'INACTIVE' && tier.status !== 'SUSPENDED') return false;
            break;
          case 'NO_CONTACT':
            if (tier.contactName && tier.contactName.trim() !== '') return false;
            break;
          case 'VIP':
            if (tier.type !== 'CLIENT' || tier.clientData?.segment !== 'VIP') return false;
            break;
        }
      }
      return true;
    };
  }, [activeFilters]);
  
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const importMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
              setIsFilterMenuOpen(false);
          }
          if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
              setIsColumnMenuOpen(false);
          }
          if (importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
              setIsImportMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = () => {
    setEditingTier(undefined);
    setShowForm(true);
  };

  const handleEdit = (tier: Tier) => {
    setEditingTier(tier);
    setShowForm(true);
  };

  const handleSubmit = async (data: Partial<Tier>) => {
    try {
      if (editingTier) {
        updateTier({ ...editingTier, ...data } as Tier);
      } else {
        addTier(data as Tier);
      }
      setShowForm(false);
    } catch (error) {
      logger.error("Failed to save tier", error);
    }
  };

  const handleDownloadTemplate = () => {
      showToast(TOAST.IO.TEMPLATE_DOWNLOADED, 'info');
  };

  // Export Excel function
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredTiers.filter(t => filterType === 'ALL' || t.type === filterType);
      
      // Create CSV content
      const headers = ['ID', 'Type', 'Nom', 'Email', 'Téléphone', 'Ville', 'Pays', 'Statut', 'Code Comptable', 'Date Création'];
      const rows = dataToExport.map(t => [
        t.id,
        t.type,
        t.name,
        t.email || '',
        t.phone || '',
        t.city || '',
        t.country || '',
        t.status,
        t.accountingCode || '',
        new Date(t.createdAt).toLocaleDateString('fr-FR')
      ]);
      
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tiers_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      
      showToast(TOAST.IO.EXPORT_SUCCESS('CSV', dataToExport.length), 'success');
    } catch (error) {
      showToast(TOAST.IO.EXPORT_ERROR('CSV'), 'error');
    }
  };

  const toggleFilter = (filterId: string) => {
      setActiveFilters(prev => 
          prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
      );
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Tiers & Partenaires</h2>
          <p className="text-slate-500 text-sm hidden sm:block">Gestion unifiée des Clients, Revendeurs et Fournisseurs</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
            {!externalDateRange && (
                <div className="hidden sm:block">
                <DateRangeSelector
                    periodPreset={periodPreset}
                    setPeriodPreset={setPeriodPreset}
                    customDateRange={customDateRange}
                    setCustomDateRange={setCustomDateRange}
                />
                </div>
            )}
            {/* FILTER BUTTON */}
            <div className="relative" ref={filterMenuRef}>
                <button 
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={`p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors ${isFilterMenuOpen || activeFilters.length > 0 ? 'bg-slate-50 dark:bg-slate-700 ring-2 ring-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)]' : ''}`}
                    title="Filtrer les résultats"
                >
                    <Filter className="w-4 h-4"/>
                </button>
                {isFilterMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Filtres Rapides
                        </div>
                        <div className="p-1">
                            {[
                                { id: 'OVERDUE', label: 'Tiers en impayés' },
                                { id: 'INACTIVE', label: 'Tiers inactifs' },
                                { id: 'NO_CONTACT', label: 'Sans contact principal' },
                                { id: 'VIP', label: 'Clients VIP' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => toggleFilter(opt.id)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                                >
                                    <span>{opt.label}</span>
                                    {activeFilters.includes(opt.id) && <Check className="w-3 h-3 text-[var(--primary)]"/>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* COLUMNS BUTTON — desktop only */}
            <div className="hidden sm:block relative" ref={columnMenuRef}>
                <button 
                    onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                    className={`p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors ${isColumnMenuOpen ? 'bg-slate-50 dark:bg-slate-700 ring-2 ring-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)]' : ''}`}
                    title="Gérer les colonnes"
                >
                    <LayoutTemplate className="w-4 h-4"/>
                </button>
                {isColumnMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Colonnes Visibles
                        </div>
                        <div className="p-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {['Nom', 'Type', 'Email', 'Téléphone', 'Ville', 'Statut', 'Date Création'].map(col => (
                                <label key={col} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"/>
                                    <span className="text-sm text-slate-600 dark:text-slate-300">{col}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 self-center"></div>

            {/* EXPORT BUTTON — desktop only */}
            <button
                onClick={handleExportExcel}
                className="hidden sm:block p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors active:bg-slate-100 dark:active:bg-slate-800"
                title="Exporter en Excel (CSV)"
            >
                <Download className="w-4 h-4"/>
            </button>

            {/* IMPORT BUTTON — desktop only */}
            <div className="hidden sm:block relative" ref={importMenuRef}>
                <button 
                    onClick={() => setIsImportMenuOpen(!isImportMenuOpen)}
                    className={`p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors ${isImportMenuOpen ? 'bg-slate-50 dark:bg-slate-700 ring-2 ring-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)]' : ''}`}
                    title="Importer des données"
                >
                    <Upload className="w-4 h-4"/>
                </button>
                {isImportMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Import de données
                        </div>
                        <button 
                            onClick={() => {
                                showToast(TOAST.CRM.FEATURE_COMING_SOON('Import de fichier'), 'info');
                                setIsImportMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-green-600"/> 
                            <span>Importer un fichier</span>
                        </button>
                        <button 
                            onClick={() => {
                                handleDownloadTemplate();
                                setIsImportMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            <Download className="w-4 h-4 text-[var(--primary)]"/> 
                            <span>Télécharger le modèle</span>
                        </button>
                    </div>
                )}
            </div>

            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors ml-2 shadow-sm shadow-blue-200 dark:shadow-none"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau Tiers</span>
            </button>
        </div>
      </div>

      {/* KPI CARDS - Hidden on mobile */}
      {!isMobile && (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Clients Actifs</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{kpis.activeClients} <span className="text-xs font-normal text-slate-400">/ {kpis.totalClients}</span></p>
            </div>
            <div className="p-3 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded-full text-[var(--primary)]">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Nouveaux (Mois)</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">+{kpis.newClients}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-full text-green-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Revendeurs</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{kpis.resellers}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-full text-purple-600">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Fournisseurs</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{kpis.suppliers}</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-full text-orange-600">
              <LayoutTemplate className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>
      )}

      <Card className="p-3 sm:p-4 border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center shrink-0">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un tiers..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 shrink-0">
            {(['ALL', 'CLIENT', 'RESELLER', 'SUPPLIER', 'PROSPECT'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  filterType === type
                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {type === 'ALL' ? 'Tous' : type}
              </button>
            ))}
          </div>
      </Card>

      <TierList 
          type={filterType}
          searchTerm={searchTerm}
          onEdit={handleEdit}
          onViewDetail={(tier) => {
            setSelectedTier(tier);
            setShowDetail(true);
          }}
          dateRange={dateRange}
          filter={getFilterFunction}
      />

      <TierForm
          isOpen={showForm}
          initialData={editingTier || {}}
          onSave={handleSubmit}
          onClose={() => setShowForm(false)}
      />

      <TierDetailModal 
        tier={selectedTier}
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedTier(null); }}
        onEdit={(tier) => { setShowDetail(false); setSelectedTier(null); handleEdit(tier); }}
      />
    </div>
  );
};
