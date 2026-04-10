import React, { useState, useMemo } from 'react';
import type { Vehicle } from '../../../types';
import {
  Activity, Wrench, Droplet, Zap, FileText, Briefcase, LifeBuoy,
  Map as MapIcon, PauseCircle, Clock, WifiOff, Gauge,
  MapPin, Thermometer, Lock, Bell, Server, AlertOctagon, Shield,
  Fuel, Droplets, AlertTriangle, TrendingUp, BarChart3,
  Leaf, Calendar, DollarSign, ShoppingCart, CreditCard, PieChart,
  MessageSquare, CheckCircle, Search, ArrowLeft, Sparkles, ChevronRight,
} from 'lucide-react';
import { AiAnalysisModal } from './AiAnalysisModal';
import { analyzeReport } from '../../../services/geminiService';
import { ActivityReports } from './tabs/ActivityReports';
import { TechnicalReports } from './tabs/TechnicalReports';
import { FuelReports } from './tabs/FuelReports';
import { PerformanceReports } from './tabs/PerformanceReports';
import { LogReports } from './tabs/LogReports';
import { BusinessReports } from './tabs/BusinessReports';
import { SupportReports } from './tabs/SupportReports';

// ── Catalog definition ───────────────────────────────────────────────────────

interface ReportItem {
  id: string;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}

interface ReportSection {
  id: string;
  label: string;
  description: string;
  color: string;       // bg color for icon badge
  textColor: string;   // text color for category label
  borderColor: string; // card accent border
  bgLight: string;     // card bg tint
  sectionIcon: React.FC<{ className?: string }>;
  tab: string;
  items: ReportItem[];
}

const CATALOG: ReportSection[] = [
  {
    id: 'activity', label: 'Activité', tab: 'activity',
    description: 'Suivi des trajets, arrêts, vitesse et inactivité de la flotte',
    color: 'bg-[var(--primary-dim)]0', textColor: 'text-[var(--primary)] dark:text-[var(--primary)]',
    borderColor: 'border-[var(--border)] dark:border-[var(--primary)]', bgLight: 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]',
    sectionIcon: Activity,
    items: [
      { id: 'summary', label: "Synthèse d'activité", description: 'Vue globale : distance, temps conduite, arrêts', icon: Activity },
      { id: 'trips', label: 'Trajets', description: 'Analyse détaillée par trajet, conducteur ou journée', icon: MapIcon },
      { id: 'stops', label: 'Arrêts', description: 'Durées, lieux et types d\'arrêt', icon: PauseCircle },
      { id: 'idling', label: 'Ralenti moteur', description: 'Périodes de ralenti et coût estimé carburant', icon: Clock },
      { id: 'offline', label: 'Véhicules hors-ligne', description: 'Déconnexions GPS et historique', icon: WifiOff },
      { id: 'speed', label: 'Vitesse', description: 'Infractions, classement conducteurs', icon: Gauge },
    ],
  },
  {
    id: 'technical', label: 'Technique', tab: 'technical',
    description: 'Geofencing, maintenance, alertes et données capteurs',
    color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800', bgLight: 'bg-red-50 dark:bg-red-900/10',
    sectionIcon: Wrench,
    items: [
      { id: 'summary', label: 'Synthèse technique', description: 'KPIs alertes, maintenance et capteurs', icon: Activity },
      { id: 'geofencing', label: 'Geofencing', description: 'Entrées, sorties et violations de zones', icon: MapIcon },
      { id: 'poi', label: "Points d'intérêt", description: 'Visites et fréquence par POI', icon: MapPin },
      { id: 'maintenance', label: 'Maintenance', description: 'Maintenances à venir, effectuées, coûts', icon: Wrench },
      { id: 'sensors', label: 'Capteurs', description: 'Température, poids, batterie en temps réel', icon: Thermometer },
      { id: 'immobilization', label: 'Immobilisation', description: 'Historique des immobilisations à distance', icon: Lock },
      { id: 'alerts', label: 'Alertes', description: 'Vue d\'ensemble, alertes critiques, par type', icon: Bell },
    ],
  },
  {
    id: 'fuel', label: 'Carburant', tab: 'fuel',
    description: 'Consommation, ravitaillements, pertes et efficacité',
    color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800', bgLight: 'bg-orange-50 dark:bg-orange-900/10',
    sectionIcon: Droplet,
    items: [
      { id: 'summary', label: 'Synthèse carburant', description: 'Coûts totaux, volume, alertes vol', icon: Activity },
      { id: 'consumption', label: 'Consommation', description: 'Par véhicule, par période, comparaison', icon: Fuel },
      { id: 'refills', label: 'Recharges', description: 'Détail ravitaillements et synthèse par station', icon: Droplets },
      { id: 'theft', label: 'Pertes suspectes', description: 'Alertes vol et analyse des pertes', icon: AlertTriangle },
      { id: 'efficiency', label: 'Efficacité', description: 'Classement et tendances d\'efficacité', icon: TrendingUp },
      { id: 'charts', label: 'Graphiques', description: 'Visualisation consommation et coûts', icon: BarChart3 },
    ],
  },
  {
    id: 'performance', label: 'Performance', tab: 'performance',
    description: 'Productivité, éco-conduite, heures moteur et dépenses',
    color: 'bg-green-500', textColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800', bgLight: 'bg-green-50 dark:bg-green-900/10',
    sectionIcon: Zap,
    items: [
      { id: 'summary', label: 'Synthèse performance', description: 'Score flotte, heures moteur, taux utilisation', icon: Activity },
      { id: 'productivity', label: 'Productivité', description: 'Par conducteur et par véhicule', icon: TrendingUp },
      { id: 'eco', label: 'Éco-conduite', description: 'Scores, infractions et classement', icon: Leaf },
      { id: 'schedule', label: 'Emploi du temps', description: 'Planning conducteurs et heures sup', icon: Calendar },
      { id: 'expenses', label: 'Dépenses', description: 'Par véhicule et par catégorie', icon: DollarSign },
      { id: 'engine', label: 'Heures moteur', description: 'Cumul, taux d\'utilisation par véhicule', icon: Clock },
    ],
  },
  {
    id: 'logs', label: 'Journaux', tab: 'logs',
    description: 'Logs système, événements, erreurs et piste d\'audit',
    color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800', bgLight: 'bg-purple-50 dark:bg-purple-900/10',
    sectionIcon: FileText,
    items: [
      { id: 'summary', label: 'Synthèse journaux', description: 'Erreurs, actions admin, connexions', icon: Activity },
      { id: 'system', label: 'Système', description: 'Logs INFO, WARN, ERROR du serveur', icon: Server },
      { id: 'events', label: 'Événements', description: 'Connexions et modifications de données', icon: FileText },
      { id: 'errors', label: 'Erreurs', description: 'Erreurs serveur et parsers GPS', icon: AlertOctagon },
      { id: 'audit', label: "Piste d'audit", description: 'Toutes les actions admin et utilisateur', icon: Shield },
    ],
  },
  {
    id: 'business', label: 'Business', tab: 'business',
    description: 'Devis, factures, paiements et comptabilité',
    color: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-500',
    borderColor: 'border-yellow-200 dark:border-yellow-800', bgLight: 'bg-yellow-50 dark:bg-yellow-900/10',
    sectionIcon: Briefcase,
    items: [
      { id: 'summary', label: 'Synthèse Business', description: 'CA mensuel, factures en attente, devis', icon: PieChart },
      { id: 'quotes', label: 'Devis', description: 'Tous, en attente, acceptés', icon: FileText },
      { id: 'invoices', label: 'Factures', description: 'Toutes, non payées, en retard', icon: ShoppingCart },
      { id: 'payments', label: 'Paiements', description: 'Encaissements par méthode', icon: CreditCard },
      { id: 'accounting', label: 'Comptabilité', description: 'Journal et bilan comptable', icon: DollarSign },
    ],
  },
  {
    id: 'support', label: 'Support', tab: 'support',
    description: 'Tickets, délais de résolution et satisfaction client',
    color: 'bg-slate-500', textColor: 'text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700', bgLight: 'bg-slate-50 dark:bg-slate-800/50',
    sectionIcon: LifeBuoy,
    items: [
      { id: 'summary', label: 'Synthèse Support', description: 'Tickets ouverts, temps réponse, satisfaction', icon: LifeBuoy },
      { id: 'tickets', label: 'Tickets', description: 'Tous les tickets, par priorité, par catégorie', icon: MessageSquare },
      { id: 'resolved', label: 'Tickets résolus', description: 'Liste et statistiques de résolution', icon: CheckCircle },
      { id: 'pending', label: 'Tickets en attente', description: 'En cours, dépassements SLA', icon: Clock },
    ],
  },
];

// ── ReportsView ──────────────────────────────────────────────────────────────

export const ReportsView: React.FC<{ vehicles: Vehicle[] }> = ({ vehicles }) => {

  type ViewMode = 'catalog' | 'report';
  const [view, setView] = useState<ViewMode>('catalog');
  const [activeTab, setActiveTab] = useState('activity');
  const [activeItem, setActiveItem] = useState('summary');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // AI state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [currentReportContext, setCurrentReportContext] = useState<{ title: string; columns: string[]; data: string[][] } | null>(null);

  const handleAiAnalysis = async (title: string, columns: string[], data: string[][]) => {
    setCurrentReportContext({ title, columns, data });
    setIsAiModalOpen(true);
    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
      const result = await analyzeReport(title, columns, data);
      setAnalysisResult(result);
    } catch {
      setAnalysisResult("Erreur lors de l'analyse. Veuillez réessayer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const navigateTo = (tab: string, itemId: string) => {
    setActiveTab(tab);
    setActiveItem(itemId);
    setView('report');
  };

  const currentSection = CATALOG.find(s => s.tab === activeTab);
  const currentItem = currentSection?.items.find(i => i.id === activeItem);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    return CATALOG
      .filter(s => !activeCategory || s.id === activeCategory)
      .map(s => ({
        ...s,
        items: q
          ? s.items.filter(i => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || s.label.toLowerCase().includes(q))
          : s.items,
      }))
      .filter(s => s.items.length > 0);
  }, [catalogSearch, activeCategory]);

  // Tab component renderer
  const renderTabComponent = (tab: string, item: string) => {
    const key = `${tab}-${item}`;
    const shared = { onAiAnalysis: handleAiAnalysis, initialItem: item };
    switch (tab) {
      case 'activity':    return <ActivityReports    key={key} vehicles={vehicles} {...shared} />;
      case 'technical':   return <TechnicalReports   key={key} vehicles={vehicles} {...shared} />;
      case 'fuel':        return <FuelReports         key={key} vehicles={vehicles} {...shared} />;
      case 'performance': return <PerformanceReports  key={key} vehicles={vehicles} {...shared} />;
      case 'logs':        return <LogReports          key={key} onAiAnalysis={handleAiAnalysis} initialItem={item} />;
      case 'business':    return <BusinessReports     key={key} onAiAnalysis={handleAiAnalysis} initialItem={item} />;
      case 'support':     return <SupportReports      key={key} vehicles={vehicles} {...shared} />;
      default:            return <ActivityReports     key={key} vehicles={vehicles} {...shared} />;
    }
  };

  // ── CATALOG VIEW ───────────────────────────────────────────────────────────
  const CatalogView = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Rapports & Analyses</h1>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un rapport…"
            value={catalogSearch}
            onChange={e => setCatalogSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              !activeCategory
                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Tous
          </button>
          {CATALOG.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveCategory(activeCategory === s.id ? null : s.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === s.id
                  ? `${s.color} text-white`
                  : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <s.sectionIcon className="w-3 h-3" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-auto px-6 py-5 space-y-8">
        {filteredCatalog.map(section => (
          <div key={section.id}>
            {/* Section header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-7 h-7 rounded-lg ${section.color} flex items-center justify-center`}>
                <section.sectionIcon className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">{section.label}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
              </div>
            </div>

            {/* Report cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(section.tab, item.id)}
                    className="group text-left p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-[var(--primary)] dark:hover:border-[var(--primary)] hover:shadow-md transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg ${section.bgLight} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-4 h-4 ${section.textColor}`} />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[var(--primary)] dark:group-hover:text-[var(--primary)] transition-colors shrink-0 mt-0.5" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight mb-1">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredCatalog.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Aucun rapport trouvé pour « {catalogSearch} »</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── REPORT VIEW ────────────────────────────────────────────────────────────
  const ReportViewWrapper = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Minimal header */}
      <div className="shrink-0 px-4 lg:px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <button
          onClick={() => setView('catalog')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Rapports</span>
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0" />

        {currentSection && currentItem && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-6 h-6 rounded-md ${currentSection.color} flex items-center justify-center shrink-0`}>
              <currentSection.sectionIcon className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">{currentSection.label}</span>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0 hidden sm:inline" />
            <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">{currentItem.label}</span>
          </div>
        )}

        <button
          onClick={() => { setIsAiModalOpen(true); setIsAnalyzing(false); setAnalysisResult(''); }}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors text-xs font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Analyser avec l'IA</span>
        </button>
      </div>

      {/* Report content */}
      <div className="flex-1 overflow-hidden p-4 lg:p-5">
        {renderTabComponent(activeTab, activeItem)}
      </div>
    </div>
  );

  // ── ROOT ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {view === 'catalog' ? <CatalogView /> : <ReportViewWrapper />}

      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        isAnalyzing={isAnalyzing}
        analysisResult={analysisResult}
        reportLabel={currentReportContext?.title || currentItem?.label || ''}
        rowCount={currentReportContext?.data.length || 0}
      />
    </div>
  );
};
