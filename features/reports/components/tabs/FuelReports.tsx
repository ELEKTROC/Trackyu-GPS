import React, { useState, useMemo, useEffect } from 'react';
import type { Vehicle } from '../../../../types';
import { ReportLayout } from '../ReportLayout';
import { ReportTable } from '../ReportTable';
import { ReportFilterBar } from '../ReportFilterBar';
import { Fuel, Droplets, AlertTriangle, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { generatePDF } from '../../../../services/pdfService';
import { useTenantBranding } from '../../../../hooks/useTenantBranding';
import { exportReportData } from '../../../../services/exportService';
import { useDataContext } from '../../../../contexts/DataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FuelReportsProps {
    vehicles: Vehicle[];
    onAiAnalysis: (title: string, columns: string[], data: string[][]) => void;
    initialItem?: string;
}

const SUB_REPORTS: Record<string, { id: string; label: string }[]> = {
    consumption: [
        { id: 'by_vehicle', label: 'Par véhicule' },
        { id: 'by_period', label: 'Par période' },
        { id: 'comparison', label: 'Comparaison' },
    ],
    refills: [
        { id: 'detailed', label: 'Détail ravitaillements' },
        { id: 'by_station', label: 'Par station' },
    ],
    theft: [
        { id: 'alerts', label: 'Alertes vol' },
        { id: 'analysis', label: 'Analyse pertes' },
    ],
    efficiency: [
        { id: 'ranking', label: 'Classement efficacité' },
        { id: 'trends', label: 'Tendances' },
    ],
    charts: [
        { id: 'consumption_chart', label: 'Consommation' },
        { id: 'cost_chart', label: 'Coûts' },
    ],
};

export const FuelReports: React.FC<FuelReportsProps> = ({ vehicles, onAiAnalysis, initialItem }) => {
    const { branding } = useTenantBranding();
    const [activeItem, setActiveItem] = useState(initialItem || 'summary');
    const { fuelRecords } = useDataContext();
    const [selectedPeriod, setSelectedPeriod] = useState('THIS_WEEK');
    const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
    const [isGenerated, setIsGenerated] = useState(false);
    const [selectedSubReport, setSelectedSubReport] = useState(
        SUB_REPORTS[initialItem || 'summary']?.[0]?.id || ''
    );

    const menuItems = [
        { id: 'summary', label: 'Synthèse carburant', icon: Activity },
        { id: 'consumption', label: 'Consommation', icon: Fuel },
        { id: 'refills', label: 'Recharges', icon: Droplets },
        { id: 'theft', label: 'Pertes suspectes', icon: AlertTriangle },
        { id: 'efficiency', label: 'Efficacité', icon: TrendingUp },
        { id: 'charts', label: 'Graphiques', icon: BarChart3 },
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

    const filteredRecords = useMemo(() => fuelRecords.filter(r => {
        const vehicle = vehicles.find(v => v.id === r.vehicleId);
        return vehicle && selectedVehicles.has(vehicle.name);
    }), [fuelRecords, vehicles, selectedVehicles]);

    // --- DATA FUNCTIONS ---
    const getConsumptionByVehicleData = () => ({
        columns: ['Véhicule', 'Client', 'Distance (km)', 'Conso Totale (L)', 'Conso Moy (L/100km)', 'Coût Total'],
        data: vehicles.map(v => {
            const vRecords = fuelRecords.filter(r => r.vehicleId === v.id);
            const totalFuel = vRecords.reduce((s, r) => s + r.volume, 0);
            const totalCost = vRecords.reduce((s, r) => s + r.cost, 0);
            const distance = 1000;
            return [v.name, v.client || 'Non assigné', `${distance} km`, `${totalFuel.toFixed(1)} L`, `${((totalFuel / distance) * 100).toFixed(1)} L/100km`, `${totalCost.toFixed(2)}`];
        }),
    });

    const getConsumptionByPeriodData = () => {
        const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
        return {
            columns: ['Jour', 'Distance Totale', 'Conso Totale (L)', 'Conso Moy (L/100km)', 'Nb Véhicules'],
            data: days.map(day => [day, `${vehicles.length * 100} km`, `${(vehicles.length * 10).toFixed(1)} L`, '10.0 L/100km', String(vehicles.length)]),
        };
    };

    const getConsumptionComparisonData = () => ({
        columns: ['Véhicule', 'Client', 'Conso S-1', 'Conso S-2', 'Évolution', 'Tendance'],
        data: vehicles.map(v => {
            const prev = (8 + Math.random() * 4).toFixed(1);
            const curr = (8 + Math.random() * 4).toFixed(1);
            const diff = (parseFloat(curr) - parseFloat(prev)).toFixed(1);
            return [v.name, v.client || 'Non assigné', `${prev} L/100km`, `${curr} L/100km`, `${parseFloat(diff) > 0 ? '+' : ''}${diff}`, parseFloat(diff) > 0 ? '↑ Hausse' : '↓ Baisse'];
        }),
    });

    const getRefillsData = () => ({
        columns: ['Date', 'Véhicule', 'Client', 'Volume (L)', 'Coût', 'Lieu', 'Conducteur'],
        data: fuelRecords.filter(r => r.type === 'REFILL').map(r => {
            const vehicle = vehicles.find(v => v.id === r.vehicleId);
            return [new Date(r.date).toLocaleDateString('fr-FR'), vehicle?.name || r.vehicleId, vehicle?.client || 'Non assigné', `${r.volume} L`, `${r.cost}`, r.location || '--', r.driver || '--'];
        }),
    });

    const getRefillsByStationData = () => ({
        columns: ['Station', 'Nb Ravitaillements', 'Volume Total (L)', 'Coût Total', 'Coût Moyen / L'],
        data: [
            ['Total Énergies - Paris', String(filteredRecords.filter(r => r.type === 'REFILL').length), `${filteredRecords.reduce((s, r) => s + r.volume, 0).toFixed(0)} L`, `${filteredRecords.reduce((s, r) => s + r.cost, 0).toFixed(2)}`, '1.85 €'],
            ['BP - Orléans', '3', '180 L', '333.00', '1.85 €'],
        ],
    });

    const getTheftData = () => ({
        columns: ['Date', 'Véhicule', 'Client', 'Volume Perdu (L)', 'Lieu', 'Niveau Avant', 'Niveau Après'],
        data: fuelRecords.filter(r => r.type === 'THEFT_ALERT').map(r => {
            const vehicle = vehicles.find(v => v.id === r.vehicleId);
            return [new Date(r.date).toLocaleDateString('fr-FR'), vehicle?.name || r.vehicleId, vehicle?.client || 'Non assigné', `${r.volume} L`, r.location || '--', '80%', '40%'];
        }),
    });

    const getTheftAnalysisData = () => ({
        columns: ['Véhicule', 'Client', 'Nb Incidents', 'Volume Total Perdu (L)', 'Coût Estimé', 'Dernier Incident'],
        data: vehicles.map(v => {
            const incidents = fuelRecords.filter(r => r.vehicleId === v.id && r.type === 'THEFT_ALERT');
            return [v.name, v.client || 'Non assigné', String(incidents.length), `${incidents.reduce((s, r) => s + r.volume, 0).toFixed(0)} L`, `${(incidents.reduce((s, r) => s + r.volume, 0) * 1.85).toFixed(2)} €`, incidents.length ? new Date(incidents[0].date).toLocaleDateString('fr-FR') : '--'];
        }),
    });

    const getEfficiencyRankingData = () => ({
        columns: ['Rang', 'Véhicule', 'Client', 'Conso Moy (L/100km)', 'Score Efficacité', 'Distance Totale', 'Coût/km'],
        data: vehicles.map((v, i) => [String(i + 1), v.name, v.client || 'Non assigné', `${(7 + i * 0.5).toFixed(1)} L/100km`, `${Math.max(60, 95 - i * 5)}/100`, `${(i + 1) * 800} km`, `${(0.13 + i * 0.01).toFixed(2)} €`]),
    });

    const getCurrentReportData = (): { columns: string[]; data: string[][]; title: string } => {
        switch (activeItem) {
            case 'consumption':
                if (selectedSubReport === 'by_period') return { ...getConsumptionByPeriodData(), title: 'Consommation par période' };
                if (selectedSubReport === 'comparison') return { ...getConsumptionComparisonData(), title: 'Comparaison consommation' };
                return { ...getConsumptionByVehicleData(), title: 'Consommation par véhicule' };
            case 'refills':
                if (selectedSubReport === 'by_station') return { ...getRefillsByStationData(), title: 'Ravitaillements par station' };
                return { ...getRefillsData(), title: 'Détail des ravitaillements' };
            case 'theft':
                if (selectedSubReport === 'analysis') return { ...getTheftAnalysisData(), title: 'Analyse des pertes suspectes' };
                return { ...getTheftData(), title: 'Alertes vol de carburant' };
            case 'efficiency':
                return { ...getEfficiencyRankingData(), title: selectedSubReport === 'trends' ? 'Tendances d\'efficacité' : 'Classement efficacité carburant' };
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
        const chartData = vehicles.map(v => {
            const vRecords = fuelRecords.filter(r => r.vehicleId === v.id);
            return { name: v.name, volume: vRecords.reduce((s, r) => s + r.volume, 0), cost: vRecords.reduce((s, r) => s + r.cost, 0) };
        }).slice(0, 10);

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
                        <Card title="Coût Total Carburant">
                            <div className="text-3xl font-bold text-blue-600">{filteredRecords.reduce((s, r) => s + r.cost, 0).toFixed(2)}</div>
                            <p className="text-sm text-slate-500">Période sélectionnée</p>
                        </Card>
                        <Card title="Volume Consommé">
                            <div className="text-3xl font-bold text-orange-600">{filteredRecords.reduce((s, r) => s + r.volume, 0).toFixed(0)} L</div>
                            <p className="text-sm text-slate-500">Période sélectionnée</p>
                        </Card>
                        <Card title="Alertes Vol">
                            <div className="text-3xl font-bold text-red-600">{filteredRecords.filter(r => r.type === 'THEFT_ALERT').length}</div>
                            <p className="text-sm text-slate-500">Incidents détectés</p>
                        </Card>
                    </div>
                ) : activeItem === 'charts' ? (
                    <Card title={selectedSubReport === 'cost_chart' ? 'Coûts carburant par véhicule (Top 10)' : 'Consommation par véhicule (Top 10)'}>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%" minHeight={350} minWidth={200} initialDimension={{ width: 200, height: 350 }}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                    <Tooltip />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="volume" name="Volume (L)" fill="#8884d8" />
                                    <Bar yAxisId="right" dataKey="cost" name="Coût" fill="#82ca9d" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
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
