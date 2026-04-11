import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle } from '../../../../types';
import { ReportLayout } from '../ReportLayout';
import { ReportTable } from '../ReportTable';
import { ReportFilterBar } from '../ReportFilterBar';
import { LifeBuoy, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { generateTablePDF } from '../../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../../hooks/useTenantBranding';
import { exportReportData } from '../../../../services/exportService';

interface SupportReportsProps {
  vehicles: Vehicle[];
  onAiAnalysis: (title: string, columns: string[], data: string[][]) => void;
  initialItem?: string;
}

const SUB_REPORTS: Record<string, { id: string; label: string }[]> = {
  tickets: [
    { id: 'all', label: 'Tous les tickets' },
    { id: 'by_priority', label: 'Par priorité' },
    { id: 'by_category', label: 'Par catégorie' },
  ],
  resolved: [
    { id: 'list', label: 'Liste des résolus' },
    { id: 'stats', label: 'Statistiques résolution' },
  ],
  pending: [
    { id: 'list', label: 'Tickets en attente' },
    { id: 'overdue', label: 'Dépassement SLA' },
  ],
};

export const SupportReports: React.FC<SupportReportsProps> = ({ vehicles, onAiAnalysis, initialItem }) => {
  const { branding } = useTenantBranding();
  const [activeItem, setActiveItem] = useState(initialItem || 'summary');
  const [selectedPeriod, setSelectedPeriod] = useState('THIS_WEEK');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [isGenerated, setIsGenerated] = useState(false);
  const [selectedSubReport, setSelectedSubReport] = useState(SUB_REPORTS[initialItem || 'summary']?.[0]?.id || '');

  const menuItems = [
    { id: 'summary', label: 'Synthèse Support', icon: LifeBuoy },
    { id: 'tickets', label: 'Tickets', icon: MessageSquare },
    { id: 'resolved', label: 'Résolus', icon: CheckCircle },
    { id: 'pending', label: 'En attente', icon: Clock },
  ];

  const clientVehicleMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    vehicles.forEach((v) => {
      const client = v.client || 'Non assigné';
      if (!map.has(client)) map.set(client, new Set());
      map.get(client)!.add(v.name);
    });
    return map;
  }, [vehicles]);

  useEffect(() => {
    const all = new Set<string>();
    vehicles.forEach((v) => all.add(v.name));
    setSelectedVehicles(all);
  }, [vehicles]);

  useEffect(() => {
    setSelectedSubReport(SUB_REPORTS[activeItem]?.[0]?.id || '');
    setIsGenerated(false);
  }, [activeItem]);

  const handleSubReportChange = (id: string) => {
    setSelectedSubReport(id);
    setIsGenerated(false);
  };

  // --- DATA FUNCTIONS ---
  const MOCK_TICKETS = [
    ['T-1001', 'Problème connexion GPS', 'Transport Express', 'TRK-001', 'Haute', 'Ouvert', '2026-03-28', '--'],
    ['T-1002', 'Demande facture', 'Logistique Pro', '--', 'Basse', 'Fermé', '2026-03-25', '2026-03-26'],
    ['T-1003', 'Alerte répétée vitesse', 'ACME SA', 'TRK-005', 'Urgente', 'En cours', '2026-03-29', '--'],
    ['T-1004', 'Mise à jour données', 'Freight Co', '--', 'Normale', 'En attente', '2026-03-27', '--'],
    [
      'T-1005',
      'Connexion perdue balise',
      'Transport Express',
      'TRK-003',
      'Haute',
      'Résolu',
      '2026-03-24',
      '2026-03-25',
    ],
  ];

  const getTicketsData = () => ({
    columns: ['ID', 'Sujet', 'Client', 'Véhicule', 'Priorité', 'Statut', 'Date Création', 'Date Clôture'],
    data: MOCK_TICKETS,
  });

  const getTicketsByPriorityData = () => {
    const priorities = ['Urgente', 'Haute', 'Normale', 'Basse'];
    return {
      columns: ['Priorité', 'Nb Tickets', 'Ouverts', 'En cours', 'Résolus', 'Temps Moy. Résolution'],
      data: priorities.map((p) => {
        const pTickets = MOCK_TICKETS.filter((t) => t[4] === p);
        return [
          p,
          String(pTickets.length),
          String(pTickets.filter((t) => t[5] === 'Ouvert').length),
          String(pTickets.filter((t) => t[5] === 'En cours').length),
          String(pTickets.filter((t) => t[5] === 'Résolu' || t[5] === 'Fermé').length),
          p === 'Urgente' ? '2h' : p === 'Haute' ? '8h' : '48h',
        ];
      }),
    };
  };

  const getTicketsByCategoryData = () => ({
    columns: ['Catégorie', 'Nb Tickets', '% du Total', 'Temps Moy. Résolution', 'Satisfaction'],
    data: [
      ['Technique GPS', '3', '60%', '6h 30m', '4.2/5'],
      ['Facturation', '1', '20%', '24h 00m', '4.8/5'],
      ['Données / Config', '1', '20%', '12h 00m', '4.5/5'],
    ],
  });

  const getResolvedListData = () => ({
    columns: ['ID', 'Sujet', 'Client', 'Priorité', 'Date Création', 'Date Résolution', 'Durée Résolution', 'Agent'],
    data: MOCK_TICKETS.filter((t) => t[5] === 'Résolu' || t[5] === 'Fermé').map((t) => [
      ...t.slice(0, 4),
      t[6],
      t[7],
      '1j 2h',
      'Support L1',
    ]),
  });

  const getResolvedStatsData = () => ({
    columns: ['Période', 'Tickets Résolus', 'Temps Moy. (h)', 'Satisfaction Moy.', 'Taux Résolution J+1'],
    data: [
      ['Cette semaine', '2', '13', '4.5/5', '50%'],
      ['Semaine précédente', '5', '8', '4.7/5', '80%'],
      ['Ce mois', '18', '10', '4.6/5', '72%'],
    ],
  });

  const getPendingListData = () => ({
    columns: ['ID', 'Sujet', 'Client', 'Véhicule', 'Priorité', 'Âge du ticket', 'SLA Limite'],
    data: MOCK_TICKETS.filter((t) => t[5] === 'Ouvert' || t[5] === 'En attente').map((t) => [
      t[0],
      t[1],
      t[2],
      t[3],
      t[4],
      '2j 4h',
      t[4] === 'Urgente' ? '4h' : '48h',
    ]),
  });

  const getOverdueSLAData = () => ({
    columns: ['ID', 'Sujet', 'Client', 'Priorité', 'SLA Limite', 'Dépassement', 'Agent Assigné'],
    data: [['T-1003', 'Alerte répétée vitesse', 'ACME SA', 'Urgente', '4h', '+20h', 'Non assigné']],
  });

  const getCurrentReportData = (): { columns: string[]; data: string[][]; title: string } => {
    switch (activeItem) {
      case 'tickets':
        if (selectedSubReport === 'by_priority')
          return { ...getTicketsByPriorityData(), title: 'Tickets par priorité' };
        if (selectedSubReport === 'by_category')
          return { ...getTicketsByCategoryData(), title: 'Tickets par catégorie' };
        return { ...getTicketsData(), title: 'Tous les tickets' };
      case 'resolved':
        if (selectedSubReport === 'stats') return { ...getResolvedStatsData(), title: 'Statistiques de résolution' };
        return { ...getResolvedListData(), title: 'Tickets résolus' };
      case 'pending':
        if (selectedSubReport === 'overdue') return { ...getOverdueSLAData(), title: 'Dépassements SLA' };
        return { ...getPendingListData(), title: 'Tickets en attente' };
      default:
        return { columns: [], data: [], title: '' };
    }
  };

  const handleExport = (title: string, columns: string[], data: string[][]) => {
    generateTablePDF({
      title: `Rapport : ${title}`,
      headers: columns,
      rows: data,
      filename: `rapport_support_${activeItem}_${new Date().toISOString().slice(0, 10)}.pdf`,
      branding,
    });
  };

  const handleGenerate = (mode: 'view' | 'csv' | 'excel' | 'pdf') => {
    if (mode === 'view') {
      setIsGenerated(true);
      return;
    }
    const { columns, data, title } = getCurrentReportData();
    if (!columns.length) {
      setIsGenerated(true);
      return;
    }
    if (mode === 'pdf') handleExport(title, columns, data);
    else
      exportReportData(
        columns,
        data,
        `rapport_support_${activeItem}_${selectedSubReport}_${new Date().toISOString().slice(0, 10)}`,
        mode
      );
  };

  const currentSubReports = SUB_REPORTS[activeItem] || [];

  const renderContent = () => {
    const { columns, data, title } = getCurrentReportData();
    return (
      <div className="space-y-6">
        <ReportFilterBar
          period={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          clientVehicleMap={clientVehicleMap}
          selectedVehicles={selectedVehicles}
          onSelectionChange={setSelectedVehicles}
          onGenerate={handleGenerate}
          reports={currentSubReports}
          selectedReport={selectedSubReport}
          onReportChange={handleSubReportChange}
        />
        {!isGenerated ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] border-dashed">
            <LifeBuoy className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Sélectionnez les filtres et cliquez sur "Générer"</p>
          </div>
        ) : activeItem === 'summary' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card title="Tickets Ouverts">
              <div className="text-3xl font-bold text-red-600">3</div>
              <p className="text-sm text-[var(--text-secondary)]">Dont 1 urgent</p>
            </Card>
            <Card title="Temps Moyen Réponse">
              <div className="text-3xl font-bold text-[var(--primary)]">2h 15m</div>
              <p className="text-sm text-[var(--text-secondary)]">Derniers 30 jours</p>
            </Card>
            <Card title="Satisfaction Client">
              <div className="text-3xl font-bold text-green-600">4.5/5</div>
              <p className="text-sm text-[var(--text-secondary)]">Moyenne période</p>
            </Card>
          </div>
        ) : columns.length > 0 ? (
          <ReportTable
            title={title}
            columns={columns}
            data={data}
            onExport={(cols, d) => handleExport(title, cols, d)}
            onAiAnalysis={(cols, d) => onAiAnalysis(title, cols, d)}
          />
        ) : null}
      </div>
    );
  };

  return (
    <ReportLayout menuItems={menuItems} activeItem={activeItem} onItemChange={setActiveItem}>
      {renderContent()}
    </ReportLayout>
  );
};
