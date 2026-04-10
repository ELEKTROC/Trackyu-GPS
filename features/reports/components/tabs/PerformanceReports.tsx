import React, { useState, useMemo, useEffect } from 'react';
import { Vehicle } from '../../../../types';
import { ReportLayout } from '../ReportLayout';
import { ReportTable } from '../ReportTable';
import { ReportFilterBar } from '../ReportFilterBar';
import { TrendingUp, Leaf, Calendar, DollarSign, Clock, Activity } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { generatePDF } from '../../../../services/pdfService';
import { useTenantBranding } from '../../../../hooks/useTenantBranding';
import { exportReportData } from '../../../../services/exportService';

interface PerformanceReportsProps {
    vehicles: Vehicle[];
    onAiAnalysis: (title: string, columns: string[], data: string[][]) => void;
    initialItem?: string;
}

const SUB_REPORTS: Record<string, { id: string; label: string }[]> = {
    productivity: [
        { id: 'by_driver', label: 'Par conducteur' },
        { id: 'by_vehicle', label: 'Par véhicule' },
    ],
    eco: [
        { id: 'scores', label: 'Scores éco-conduite' },
        { id: 'violations', label: 'Infractions' },
        { id: 'ranking', label: 'Classement' },
    ],
    schedule: [
        { id: 'daily', label: 'Emplois du temps' },
        { id: 'overtime', label: 'Heures supplémentaires' },
    ],
    expenses: [
        { id: 'by_vehicle', label: 'Par véhicule' },
        { id: 'by_category', label: 'Par catégorie' },
    ],
    engine: [
        { id: 'hours', label: 'Heures moteur' },
        { id: 'utilization', label: 'Taux utilisation' },
    ],
};

export const PerformanceReports: React.FC<PerformanceReportsProps> = ({ vehicles, onAiAnalysis, initialItem }) => {
    const { branding } = useTenantBranding();
    const [activeItem, setActiveItem] = useState(initialItem || 'summary');
    const [selectedPeriod, setSelectedPeriod] = useState('THIS_WEEK');
    const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
    const [isGenerated, setIsGenerated] = useState(false);
    const [selectedSubReport, setSelectedSubReport] = useState(
        SUB_REPORTS[initialItem || 'summary']?.[0]?.id || ''
    );

    const menuItems = [
        { id: 'summary', label: 'Synthèse performance', icon: Activity },
        { id: 'productivity', label: 'Productivité', icon: TrendingUp },
        { id: 'eco', label: 'Éco-conduite', icon: Leaf },
        { id: 'schedule', label: 'Emploi du temps', icon: Calendar },
        { id: 'expenses', label: 'Dépenses', icon: DollarSign },
        { id: 'engine', label: 'Heures moteur', icon: Clock },
    ];

    const clientVehicleMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        vehicles.forEach(v => {
            const client = v.client || 'Non assigné';
            if (!map.has(client)) map.set(client, new Set());
            map.get(client)!.add(v.name);
        });
        return map;
    }, [vehicles]);

    useEffect(() => {
        const all = new Set<string>();
        vehicles.forEach(v => all.add(v.name));
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

    const filteredVehicles = useMemo(() => vehicles.filter(v => selectedVehicles.has(v.name)), [vehicles, selectedVehicles]);

    // --- DATA FUNCTIONS ---
    const getProductivityByDriverData = () => ({
        columns: ['Conducteur', 'Nb Trajets', 'Distance Totale', 'Heures Conduite', 'Km/h Moy.', 'Nb Arrêts Clients', 'Véhicule'],
        data: vehicles.map((v, i) => ['Jean Dupont', String(5 + i), `${(i + 1) * 200} km`, `${5 + i}h 30m`, '65 km/h', String(4 + i), v.name]),
    });

    const getProductivityByVehicleData = () => ({
        columns: ['Véhicule', 'Client', 'Nb Trajets', 'Distance Totale', 'Taux Utilisation', 'Km/jour Moy.', 'Conducteur Principal'],
        data: vehicles.map((v, i) => [v.name, v.client || 'Non assigné', String(5 + i), `${(i + 1) * 200} km`, `${60 + i * 5}%`, `${100 + i * 20} km`, 'Jean Dupont']),
    });

    const getEcoScoresData = () => ({
        columns: ['Conducteur', 'Véhicule', 'Client', 'Score Global', 'Freinages Brusques', 'Accélérations', 'Ralenti Excessif', 'Conso Moy'],
        data: vehicles.map(v => ['Jean Dupont', v.name, v.client || 'Non assigné', `${v.driverScore ?? 0}/100`,
            String(Math.floor(Math.random() * 10)), String(Math.floor(Math.random() * 10)),
            `${Math.floor(Math.random() * 60)} min`, `${(8 + Math.random() * 4).toFixed(1)} L/100km`]),
    });

    const getEcoViolationsData = () => ({
        columns: ['Date', 'Conducteur', 'Véhicule', 'Client', 'Type Infraction', 'Sévérité', 'Lieu'],
        data: vehicles.flatMap(v => [
            [new Date().toLocaleDateString('fr-FR'), 'Jean Dupont', v.name, v.client || 'Non assigné', 'Freinage brusque', 'Moyen', 'Autoroute A10'],
            [new Date().toLocaleDateString('fr-FR'), 'Jean Dupont', v.name, v.client || 'Non assigné', 'Accélération forte', 'Faible', 'Zone urbaine'],
        ]),
    });

    const getEcoRankingData = () => ({
        columns: ['Rang', 'Conducteur', 'Score Éco', 'Conso Moy', 'Nb Infractions', 'Km Parcourus', 'Véhicule Principal'],
        data: vehicles.map((v, i) => [String(i + 1), 'Jean Dupont', `${Math.max(50, 95 - i * 8)}/100`, `${(8 + i * 0.3).toFixed(1)} L/100km`, String(i * 2), `${(i + 1) * 300} km`, v.name]),
    });

    const getEngineHoursData = () => ({
        columns: ['Véhicule', 'Client', 'Heures Totales', 'Heures Ralenti', 'Heures Travail', 'Heures Maintenance'],
        data: vehicles.map(v => [v.name, v.client || 'Non assigné', `${v.engineHours || 0} h`, `${Math.floor((v.engineHours || 0) * 0.2)} h`, `${Math.floor((v.engineHours || 0) * 0.75)} h`, `${Math.floor((v.engineHours || 0) * 0.05)} h`]),
    });

    const getEngineUtilizationData = () => ({
        columns: ['Véhicule', 'Client', 'Taux Utilisation', 'Heures Disponibles', 'Heures Utilisées', 'Heures Inutilisées', 'Objectif'],
        data: vehicles.map(v => {
            const rate = Math.floor(50 + Math.random() * 40);
            return [v.name, v.client || 'Non assigné', `${rate}%`, '160 h', `${Math.floor(160 * rate / 100)} h`, `${160 - Math.floor(160 * rate / 100)} h`, '80%'];
        }),
    });

    const getCurrentReportData = (): { columns: string[]; data: string[][]; title: string } => {
        switch (activeItem) {
            case 'productivity':
                if (selectedSubReport === 'by_vehicle') return { ...getProductivityByVehicleData(), title: 'Productivité par véhicule' };
                return { ...getProductivityByDriverData(), title: 'Productivité par conducteur' };
            case 'eco':
                if (selectedSubReport === 'violations') return { ...getEcoViolationsData(), title: 'Infractions éco-conduite' };
                if (selectedSubReport === 'ranking') return { ...getEcoRankingData(), title: 'Classement éco-conduite' };
                return { ...getEcoScoresData(), title: 'Scores éco-conduite' };
            case 'schedule':
                return { ...getProductivityByDriverData(), title: selectedSubReport === 'overtime' ? 'Heures supplémentaires' : 'Emplois du temps' };
            case 'expenses':
                return { ...getProductivityByVehicleData(), title: selectedSubReport === 'by_category' ? 'Dépenses par catégorie' : 'Dépenses par véhicule' };
            case 'engine':
                if (selectedSubReport === 'utilization') return { ...getEngineUtilizationData(), title: 'Taux d\'utilisation moteur' };
                return { ...getEngineHoursData(), title: 'Suivi des heures moteur' };
            default:
                return { columns: [], data: [], title: '' };
        }
    };

    const handleExport = (title: string, columns: string[], data: string[][]) => {
        generatePDF(`Rapport : ${title}`, columns,
            data.map(row => { const obj: Record<string, string> = {}; columns.forEach((col, i) => { obj[col] = row[i]; }); return obj; }),
            `rapport_${activeItem}_${new Date().toISOString().slice(0, 10)}.pdf`, { branding }
        );
    };

    const handleGenerate = (mode: 'view' | 'csv' | 'excel' | 'pdf') => {
        if (mode === 'view') { setIsGenerated(true); return; }
        const { columns, data, title } = getCurrentReportData();
        if (!columns.length) { setIsGenerated(true); return; }
        if (mode === 'pdf') handleExport(title, columns, data);
        else exportReportData(columns, data, `rapport_${activeItem}_${selectedSubReport}_${new Date().toISOString().slice(0, 10)}`, mode);
    };

    const currentSubReports = SUB_REPORTS[activeItem] || [];

    const renderContent = () => {
        const { columns, data, title } = getCurrentReportData();
        const avgScore = filteredVehicles.length > 0
            ? filteredVehicles.reduce((s, v) => s + (v.driverScore ?? 0), 0) / filteredVehicles.length : 0;

        return (
            <div className="space-y-6">
                <ReportFilterBar
                    period={selectedPeriod} onPeriodChange={setSelectedPeriod}
                    clientVehicleMap={clientVehicleMap} selectedVehicles={selectedVehicles} onSelectionChange={setSelectedVehicles}
                    onGenerate={handleGenerate}
                    reports={currentSubReports} selectedReport={selectedSubReport} onReportChange={handleSubReportChange}
                />
                {!isGenerated ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <Activity className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Sélectionnez les filtres et cliquez sur "Générer"</p>
                    </div>
                ) : activeItem === 'summary' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Card title="Score de Flotte Moyen">
                            <div className="text-3xl font-bold text-blue-600">{avgScore.toFixed(1)}/100</div>
                            <p className="text-sm text-slate-500">Performance globale</p>
                        </Card>
                        <Card title="Heures Moteur Totales">
                            <div className="text-3xl font-bold text-green-600">{filteredVehicles.reduce((s, v) => s + (v.engineHours || 0), 0).toLocaleString()} h</div>
                            <p className="text-sm text-slate-500">Cumul flotte</p>
                        </Card>
                        <Card title="Taux Utilisation Moyen">
                            <div className="text-3xl font-bold text-orange-600">72%</div>
                            <p className="text-sm text-slate-500">Flotte active</p>
                        </Card>
                    </div>
                ) : columns.length > 0 ? (
                    <ReportTable title={title} columns={columns} data={data}
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
