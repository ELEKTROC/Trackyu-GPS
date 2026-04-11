import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle } from '../../../../types';
import { ReportLayout } from '../ReportLayout';
import { ReportTable } from '../ReportTable';
import { ReportFilterBar } from '../ReportFilterBar';
import { Map as MapIcon, Clock, Activity, PauseCircle, WifiOff, Gauge } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { generateTablePDF } from '../../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../../hooks/useTenantBranding';
import { exportReportData } from '../../../../services/exportService';

interface ActivityReportsProps {
  vehicles: Vehicle[];
  onAiAnalysis: (title: string, columns: string[], data: string[][]) => void;
  initialItem?: string;
}

const SUB_REPORTS: Record<string, { id: string; label: string }[]> = {
  trips: [
    { id: 'detailed', label: 'Rapport détaillé' },
    { id: 'by_driver', label: 'Par conducteur' },
    { id: 'by_day', label: 'Synthèse journalière' },
  ],
  stops: [
    { id: 'detailed', label: 'Rapport détaillé' },
    { id: 'by_vehicle', label: 'Par véhicule' },
    { id: 'long_stops', label: 'Arrêts prolongés' },
  ],
  idling: [
    { id: 'detailed', label: 'Rapport détaillé' },
    { id: 'cost', label: 'Coût estimé' },
  ],
  offline: [
    { id: 'current', label: 'Véhicules hors-ligne' },
    { id: 'history', label: 'Historique déconnexions' },
  ],
  speed: [
    { id: 'violations', label: 'Infractions de vitesse' },
    { id: 'by_vehicle', label: 'Par véhicule' },
    { id: 'ranking', label: 'Classement conducteurs' },
  ],
};

export const ActivityReports: React.FC<ActivityReportsProps> = ({ vehicles, onAiAnalysis, initialItem }) => {
  const { branding } = useTenantBranding();
  const [activeItem, setActiveItem] = useState(initialItem || 'summary');
  const [selectedPeriod, setSelectedPeriod] = useState('THIS_WEEK');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [isGenerated, setIsGenerated] = useState(false);
  const [selectedSubReport, setSelectedSubReport] = useState(SUB_REPORTS[initialItem || 'summary']?.[0]?.id || '');

  const menuItems = [
    { id: 'summary', label: "Synthèse d'activité", icon: Activity },
    { id: 'trips', label: 'Trajets', icon: MapIcon },
    { id: 'stops', label: 'Arrêts', icon: PauseCircle },
    { id: 'idling', label: 'Ralenti', icon: Clock },
    { id: 'offline', label: 'Hors-ligne', icon: WifiOff },
    { id: 'speed', label: 'Vitesse', icon: Gauge },
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

  // Reset sub-report and generated state when active item changes
  useEffect(() => {
    setSelectedSubReport(SUB_REPORTS[activeItem]?.[0]?.id || '');
    setIsGenerated(false);
  }, [activeItem]);

  const handleSubReportChange = (id: string) => {
    setSelectedSubReport(id);
    setIsGenerated(false);
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => selectedVehicles.has(v.name));
  }, [vehicles, selectedVehicles]);

  // --- DATA FUNCTIONS ---
  const getTripsData = () => ({
    columns: [
      'Véhicule',
      'Client',
      'Conducteur',
      'Départ',
      'Arrivée',
      'Durée',
      'Distance',
      'Lieu Départ',
      'Lieu Arrivée',
    ],
    data: vehicles.flatMap((v) => [
      [
        v.name,
        v.client || 'Non assigné',
        'Jean Dupont',
        '08:00',
        '09:30',
        '1h 30m',
        '120 km',
        'Dépôt Central',
        'Client A',
      ],
      [v.name, v.client || 'Non assigné', 'Jean Dupont', '10:00', '11:15', '1h 15m', '90 km', 'Client A', 'Client B'],
    ]),
  });

  const getTripsByDriverData = () => ({
    columns: ['Conducteur', 'Nb Trajets', 'Distance Totale', 'Durée Totale', 'Vitesse Moy.', 'Véhicule Principal'],
    data: vehicles.map((v) => [
      'Jean Dupont',
      '5',
      `${vehicles.indexOf(v) * 50 + 200} km`,
      '6h 15m',
      '72 km/h',
      v.name,
    ]),
  });

  const getTripsByDayData = () => {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    return {
      columns: ['Jour', 'Date', 'Nb Trajets', 'Distance Totale', 'Véhicules Actifs', 'Conducteurs Actifs'],
      data: days.map((day, i) => [
        day,
        new Date(Date.now() - (4 - i) * 86400000).toLocaleDateString('fr-FR'),
        String(vehicles.length * 3),
        `${vehicles.length * 120} km`,
        String(vehicles.length),
        String(Math.max(1, Math.floor(vehicles.length / 2))),
      ]),
    };
  };

  const getStopsData = () => ({
    columns: ['Véhicule', 'Client', 'Heure Début', 'Heure Fin', 'Durée', 'Lieu', 'Type'],
    data: vehicles.flatMap((v) => [
      [v.name, v.client || 'Non assigné', '09:30', '10:00', '30m', 'Client A', 'Livraison'],
      [v.name, v.client || 'Non assigné', '12:00', '13:00', '1h 00m', 'Restaurant Central', 'Pause Déjeuner'],
    ]),
  });

  const getStopsByVehicleData = () => ({
    columns: ['Véhicule', 'Client', 'Nb Arrêts', 'Durée Totale', 'Durée Moyenne', 'Arrêt le plus long'],
    data: vehicles.map((v) => [v.name, v.client || 'Non assigné', '4', '2h 30m', '37m', '1h 00m']),
  });

  const getLongStopsData = () => ({
    columns: ['Véhicule', 'Client', 'Heure Début', 'Heure Fin', 'Durée', 'Lieu', 'Type'],
    data: vehicles.flatMap((v) => [
      [v.name, v.client || 'Non assigné', '12:00', '13:30', '1h 30m', 'Client B', 'Déchargement'],
    ]),
  });

  const getIdlingData = () => ({
    columns: ['Véhicule', 'Client', 'Début', 'Fin', 'Durée', 'Lieu', 'Conso Estimée'],
    data: vehicles.flatMap((v) => [
      [v.name, v.client || 'Non assigné', '08:15', '08:25', '10m', 'Dépôt - Sortie', '0.5 L'],
      [v.name, v.client || 'Non assigné', '17:00', '17:20', '20m', 'Client C - Parking', '1.0 L'],
    ]),
  });

  const getIdlingCostData = () => ({
    columns: ['Véhicule', 'Client', 'Durée Ralenti', 'Conso Estimée', 'Coût Estimé', '% du trajet'],
    data: vehicles.map((v) => [v.name, v.client || 'Non assigné', '30m', '1.5 L', '2.10 €', '8%']),
  });

  const getOfflineData = () => ({
    columns: ['Véhicule', 'Client', 'Début', 'Fin', 'Durée', 'Dernière Position'],
    data: vehicles
      .filter((v) => v.status === 'OFFLINE')
      .map((v) => [v.name, v.client || 'Non assigné', 'Hier 18:00', "Aujourd'hui 08:00", '14h 00m', 'Garage Central']),
  });

  const getOfflineHistoryData = () => ({
    columns: ['Véhicule', 'Client', 'Nb Déconnexions', 'Durée Totale', 'Durée Moyenne', 'Dernière Déconnexion'],
    data: vehicles.map((v) => [
      v.name,
      v.client || 'Non assigné',
      String(Math.floor(Math.random() * 3) + 1),
      '2h 30m',
      '50m',
      'Hier 18:00',
    ]),
  });

  const getSpeedData = () => ({
    columns: ['Véhicule', 'Client', 'Vitesse Max', 'Vitesse Moyenne', 'Violations (>90km/h)', 'Score Conduite'],
    data: vehicles.map((v) => [
      v.name,
      v.client || 'Non assigné',
      '110 km/h',
      '65 km/h',
      String(Math.floor(Math.random() * 5)),
      `${v.driverScore ?? 0}/100`,
    ]),
  });

  const getSpeedViolationsData = () => ({
    columns: ['Date', 'Véhicule', 'Client', 'Vitesse Mesurée', 'Limite Zone', 'Dépassement', 'Lieu', 'Conducteur'],
    data: vehicles.flatMap((v) => [
      [
        new Date().toLocaleDateString('fr-FR'),
        v.name,
        v.client || 'Non assigné',
        '110 km/h',
        '90 km/h',
        '+20 km/h',
        'Autoroute A10 - km 45',
        'Jean Dupont',
      ],
    ]),
  });

  const getSpeedRankingData = () => ({
    columns: ['Rang', 'Conducteur', 'Score Vitesse', 'Nb Violations', 'Vitesse Max', 'Distance Totale', 'Véhicule'],
    data: vehicles.map((v, i) => [
      String(i + 1),
      'Jean Dupont',
      `${Math.max(50, 95 - i * 8)}/100`,
      String(Math.floor(Math.random() * 5)),
      `${100 + i * 5} km/h`,
      `${(i + 1) * 180} km`,
      v.name,
    ]),
  });

  // --- ROUTE current report ---
  const getCurrentReportData = (): { columns: string[]; data: string[][]; title: string } => {
    switch (activeItem) {
      case 'trips':
        if (selectedSubReport === 'by_driver') return { ...getTripsByDriverData(), title: 'Trajets par conducteur' };
        if (selectedSubReport === 'by_day')
          return { ...getTripsByDayData(), title: 'Synthèse journalière des trajets' };
        return { ...getTripsData(), title: 'Rapport détaillé des trajets' };
      case 'stops':
        if (selectedSubReport === 'by_vehicle') return { ...getStopsByVehicleData(), title: 'Arrêts par véhicule' };
        if (selectedSubReport === 'long_stops') return { ...getLongStopsData(), title: 'Arrêts prolongés (> 1h)' };
        return { ...getStopsData(), title: 'Rapport détaillé des arrêts' };
      case 'idling':
        if (selectedSubReport === 'cost') return { ...getIdlingCostData(), title: 'Coût estimé du ralenti' };
        return { ...getIdlingData(), title: 'Rapport détaillé du ralenti' };
      case 'offline':
        if (selectedSubReport === 'history')
          return { ...getOfflineHistoryData(), title: 'Historique des déconnexions' };
        return { ...getOfflineData(), title: 'Véhicules hors-ligne' };
      case 'speed':
        if (selectedSubReport === 'violations') return { ...getSpeedViolationsData(), title: 'Infractions de vitesse' };
        if (selectedSubReport === 'ranking') return { ...getSpeedRankingData(), title: 'Classement conducteurs' };
        return { ...getSpeedData(), title: 'Vitesse par véhicule' };
      default:
        return { columns: [], data: [], title: '' };
    }
  };

  const handleExport = (title: string, columns: string[], data: string[][]) => {
    generateTablePDF({
      title: `Rapport : ${title}`,
      headers: columns,
      rows: data,
      filename: `rapport_${activeItem}_${new Date().toISOString().slice(0, 10)}.pdf`,
      branding,
    });
  };

  const handleGenerate = (mode: 'view' | 'csv' | 'excel' | 'pdf') => {
    if (mode === 'view') {
      setIsGenerated(true);
      return;
    }
    const { columns, data, title } = getCurrentReportData();
    if (!columns.length) return;
    if (mode === 'pdf') handleExport(title, columns, data);
    else
      exportReportData(
        columns,
        data,
        `rapport_${activeItem}_${selectedSubReport}_${new Date().toISOString().slice(0, 10)}`,
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
            <Activity className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Sélectionnez les filtres et cliquez sur "Générer"</p>
          </div>
        ) : activeItem === 'summary' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card title="Distance Totale">
              <div className="text-3xl font-bold text-[var(--primary)]">
                {(filteredVehicles.length * 150).toLocaleString()} km
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Cette semaine</p>
            </Card>
            <Card title="Temps de Conduite">
              <div className="text-3xl font-bold text-green-600">{filteredVehicles.length * 5}h 30m</div>
              <p className="text-sm text-[var(--text-secondary)]">Cette semaine</p>
            </Card>
            <Card title="Arrêts Clients">
              <div className="text-3xl font-bold text-orange-600">{filteredVehicles.length * 12}</div>
              <p className="text-sm text-[var(--text-secondary)]">Visites effectuées</p>
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
