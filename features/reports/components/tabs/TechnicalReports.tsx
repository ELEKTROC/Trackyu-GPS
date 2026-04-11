import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle } from '../../../../types';
import { ReportLayout } from '../ReportLayout';
import { ReportTable } from '../ReportTable';
import { ReportFilterBar } from '../ReportFilterBar';
import { MapPin, Wrench, Thermometer, Lock, Bell, Activity, Map as MapIcon } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { generateTablePDF } from '../../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../../hooks/useTenantBranding';
import { exportReportData } from '../../../../services/exportService';
import { useDataContext } from '../../../../contexts/DataContext';

interface TechnicalReportsProps {
  vehicles: Vehicle[];
  onAiAnalysis: (title: string, columns: string[], data: string[][]) => void;
  initialItem?: string;
}

const SUB_REPORTS: Record<string, { id: string; label: string }[]> = {
  geofencing: [
    { id: 'entries_exits', label: 'Entrées / Sorties' },
    { id: 'by_zone', label: 'Par zone' },
    { id: 'violations', label: 'Violations' },
  ],
  poi: [
    { id: 'visits', label: 'Visites POI' },
    { id: 'summary', label: 'Synthèse' },
  ],
  maintenance: [
    { id: 'upcoming', label: 'À venir' },
    { id: 'completed', label: 'Effectuées' },
    { id: 'all', label: 'Tout afficher' },
  ],
  sensors: [
    { id: 'current', label: 'État actuel' },
    { id: 'history', label: 'Historique' },
  ],
  immobilization: [
    { id: 'active', label: 'En cours' },
    { id: 'history', label: 'Historique' },
  ],
  alerts: [
    { id: 'all', label: 'Toutes les alertes' },
    { id: 'critical', label: 'Critiques' },
    { id: 'by_type', label: 'Par type' },
  ],
};

export const TechnicalReports: React.FC<TechnicalReportsProps> = ({ vehicles, onAiAnalysis, initialItem }) => {
  const { branding } = useTenantBranding();
  const [activeItem, setActiveItem] = useState(initialItem || 'summary');
  const { interventions, alerts } = useDataContext();
  const [selectedPeriod, setSelectedPeriod] = useState('THIS_WEEK');
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [isGenerated, setIsGenerated] = useState(false);
  const [selectedSubReport, setSelectedSubReport] = useState(SUB_REPORTS[initialItem || 'summary']?.[0]?.id || '');

  const menuItems = [
    { id: 'summary', label: 'Synthèse technique', icon: Activity },
    { id: 'geofencing', label: 'Geofencing', icon: MapIcon },
    { id: 'poi', label: "Points d'intérêt", icon: MapPin },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'sensors', label: 'Capteurs', icon: Thermometer },
    { id: 'immobilization', label: 'Immobilisation', icon: Lock },
    { id: 'alerts', label: 'Alertes', icon: Bell },
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

  const filteredAlerts = useMemo(
    () =>
      alerts.filter((a) => {
        const vehicle = vehicles.find((v) => v.name === a.vehicleName);
        return vehicle && selectedVehicles.has(vehicle.name);
      }),
    [alerts, vehicles, selectedVehicles]
  );

  const filteredInterventions = useMemo(
    () =>
      interventions.filter((int) => {
        const vehicle = vehicles.find((v) => v.id === int.vehicleId || v.name === int.licensePlate);
        return vehicle && selectedVehicles.has(vehicle.name);
      }),
    [interventions, vehicles, selectedVehicles]
  );

  // --- DATA FUNCTIONS ---
  const getGeofencingData = () => ({
    columns: ['Véhicule', 'Client', 'Zone', 'Type', 'Heure Entrée', 'Heure Sortie', 'Durée'],
    data: vehicles.flatMap((v) => [
      [v.name, v.client || 'Non assigné', 'Dépôt Paris', 'CIRCLE', '08:00', '08:30', '30m'],
      [v.name, v.client || 'Non assigné', 'Client A', 'POLYGON', '10:00', '11:00', '1h 00m'],
    ]),
  });

  const getGeofencingByZoneData = () => ({
    columns: ['Zone', 'Type', 'Nb Passages', 'Véhicules', 'Durée Totale', 'Durée Moyenne'],
    data: [
      ['Dépôt Paris', 'CIRCLE', String(vehicles.length * 2), String(vehicles.length), `${vehicles.length}h 00m`, '30m'],
      ['Client A', 'POLYGON', String(vehicles.length), String(vehicles.length), `${vehicles.length}h 00m`, '1h 00m'],
    ],
  });

  const getGeofencingViolationsData = () => ({
    columns: ['Date', 'Véhicule', 'Client', 'Zone', 'Type Violation', 'Heure', 'Conducteur'],
    data: vehicles.flatMap((v) => [
      [
        new Date().toLocaleDateString('fr-FR'),
        v.name,
        v.client || 'Non assigné',
        'Zone Interdite A',
        'Entrée non autorisée',
        '14:30',
        'Jean Dupont',
      ],
    ]),
  });

  const getMaintenanceData = (filter?: 'upcoming' | 'completed') => {
    const filtered =
      filter === 'upcoming'
        ? interventions.filter((i) => i.status === 'SCHEDULED')
        : filter === 'completed'
          ? interventions.filter((i) => i.status === 'COMPLETED')
          : interventions;
    return {
      columns: ['Véhicule', 'Client', 'Type', 'Date Prévue', 'Kilométrage', 'Statut', 'Coût'],
      data: filtered.map((int) => {
        const vehicle = vehicles.find((v) => v.id === int.vehicleId || v.name === int.licensePlate);
        return [
          int.vehicleId || int.licensePlate || '--',
          vehicle?.client || 'Non assigné',
          int.type,
          new Date(int.scheduledDate).toLocaleDateString('fr-FR'),
          int.vehicleMileage ? `${int.vehicleMileage} km` : '--',
          int.status,
          `${int.cost || 0}`,
        ];
      }),
    };
  };

  const getSensorsData = () => ({
    columns: ['Véhicule', 'Client', 'Température', 'Poids', 'Niveau Carburant', 'Batterie', 'Dernière Maj'],
    data: vehicles.map((v) => [
      v.name,
      v.client || 'Non assigné',
      `${(20 + Math.random() * 5).toFixed(1)}°C`,
      `${(1000 + Math.random() * 500).toFixed(0)} kg`,
      `${v.fuelLevel}%`,
      `${(12 + Math.random()).toFixed(1)}V`,
      new Date().toLocaleTimeString('fr-FR'),
    ]),
  });

  const getAlertsData = (filter?: 'critical') => {
    const src = filter === 'critical' ? filteredAlerts.filter((a) => a.severity === 'CRITICAL') : filteredAlerts;
    return {
      columns: ['ID', 'Véhicule', 'Client', 'Type', 'Message', 'Sévérité', 'Date', 'Statut'],
      data: src.map((a) => {
        const vehicle = vehicles.find((v) => v.name === a.vehicleName);
        return [
          a.id.toString(),
          a.vehicleName || '--',
          vehicle?.client || 'Non assigné',
          a.type,
          a.message,
          a.severity,
          new Date(a.createdAt).toLocaleString(),
          a.isRead ? 'Lu' : 'Non lu',
        ];
      }),
    };
  };

  const getAlertsByTypeData = () => {
    const byType = new Map<string, number>();
    filteredAlerts.forEach((a) => byType.set(a.type, (byType.get(a.type) || 0) + 1));
    return {
      columns: ['Type', 'Nb Alertes', 'Critiques', 'Hautes', 'Moyennes', 'Basses'],
      data: Array.from(byType.entries()).map(([type, total]) => [
        type,
        String(total),
        String(filteredAlerts.filter((a) => a.type === type && a.severity === 'CRITICAL').length),
        String(filteredAlerts.filter((a) => a.type === type && a.severity === 'HIGH').length),
        String(filteredAlerts.filter((a) => a.type === type && a.severity === 'MEDIUM').length),
        String(filteredAlerts.filter((a) => a.type === type && a.severity === 'LOW').length),
      ]),
    };
  };

  const getCurrentReportData = (): { columns: string[]; data: string[][]; title: string } => {
    switch (activeItem) {
      case 'geofencing':
        if (selectedSubReport === 'by_zone') return { ...getGeofencingByZoneData(), title: 'Geofencing par zone' };
        if (selectedSubReport === 'violations')
          return { ...getGeofencingViolationsData(), title: 'Violations de geofencing' };
        return { ...getGeofencingData(), title: 'Entrées et sorties de zones' };
      case 'poi':
        return { ...getGeofencingData(), title: "Visites Points d'Intérêt" };
      case 'maintenance':
        if (selectedSubReport === 'upcoming')
          return { ...getMaintenanceData('upcoming'), title: 'Maintenances à venir' };
        if (selectedSubReport === 'completed')
          return { ...getMaintenanceData('completed'), title: 'Maintenances effectuées' };
        return { ...getMaintenanceData(), title: 'Suivi de maintenance' };
      case 'sensors':
        return {
          ...getSensorsData(),
          title: selectedSubReport === 'history' ? 'Historique capteurs' : 'État actuel des capteurs',
        };
      case 'immobilization':
        return {
          ...getGeofencingData(),
          title: selectedSubReport === 'history' ? 'Historique immobilisations' : 'Immobilisations en cours',
        };
      case 'alerts':
        if (selectedSubReport === 'critical') return { ...getAlertsData('critical'), title: 'Alertes critiques' };
        if (selectedSubReport === 'by_type') return { ...getAlertsByTypeData(), title: 'Alertes par type' };
        return { ...getAlertsData(), title: "Vue d'ensemble des alertes" };
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
            <Card title="Alertes Critiques">
              <div className="text-3xl font-bold text-red-600">
                {filteredAlerts.filter((a) => a.severity === 'CRITICAL').length}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Dernières 24h</p>
            </Card>
            <Card title="Maintenance à venir">
              <div className="text-3xl font-bold text-[var(--primary)]">
                {filteredInterventions.filter((i) => i.status === 'SCHEDULED').length}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">Prochains 7 jours</p>
            </Card>
            <Card title="Capteurs Actifs">
              <div className="text-3xl font-bold text-green-600">{selectedVehicles.size * 3}</div>
              <p className="text-sm text-[var(--text-secondary)]">Temp, Poids, Fuel</p>
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
