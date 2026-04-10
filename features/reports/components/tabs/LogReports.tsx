import React, { useState, useEffect } from 'react';
import { ReportLayout } from '../ReportLayout';
import { ReportTable } from '../ReportTable';
import { ReportFilterBar } from '../ReportFilterBar';
import { FileText, AlertOctagon, Activity, Shield, Server } from 'lucide-react';
import { Card } from '../../../../components/Card';
import { generateTablePDF } from '../../../../services/pdfServiceV2';
import { useTenantBranding } from '../../../../hooks/useTenantBranding';
import { exportReportData } from '../../../../services/exportService';

interface LogReportsProps {
    onAiAnalysis: (title: string, columns: string[], data: string[][]) => void;
    initialItem?: string;
}

const SUB_REPORTS: Record<string, { id: string; label: string }[]> = {
    system: [
        { id: 'info', label: 'Informatif' },
        { id: 'warnings', label: 'Avertissements' },
        { id: 'errors', label: 'Erreurs' },
    ],
    events: [
        { id: 'login', label: 'Connexions' },
        { id: 'data_changes', label: 'Modifications données' },
    ],
    errors: [
        { id: 'server', label: 'Serveur' },
        { id: 'gps', label: 'GPS / Parsers' },
    ],
    audit: [
        { id: 'all', label: 'Toutes les actions' },
        { id: 'admin', label: 'Actions admin' },
        { id: 'user', label: 'Actions utilisateur' },
    ],
};

export const LogReports: React.FC<LogReportsProps> = ({ onAiAnalysis, initialItem }) => {
    const { branding } = useTenantBranding();
    const [activeItem, setActiveItem] = useState(initialItem || 'summary');
    const [selectedPeriod, setSelectedPeriod] = useState('THIS_WEEK');
    const [isGenerated, setIsGenerated] = useState(false);
    const [selectedSubReport, setSelectedSubReport] = useState(
        SUB_REPORTS[initialItem || 'summary']?.[0]?.id || ''
    );

    const menuItems = [
        { id: 'summary', label: 'Synthèse journaux', icon: Activity },
        { id: 'system', label: 'Système', icon: Server },
        { id: 'events', label: 'Événements système', icon: FileText },
        { id: 'errors', label: 'Erreurs système', icon: AlertOctagon },
        { id: 'audit', label: "Piste d'audit", icon: Shield },
    ];

    useEffect(() => {
        setSelectedSubReport(SUB_REPORTS[activeItem]?.[0]?.id || '');
        setIsGenerated(false);
    }, [activeItem]);

    const handleSubReportChange = (id: string) => {
        setSelectedSubReport(id);
        setIsGenerated(false);
    };

    // --- DATA FUNCTIONS ---
    const getSystemLogsData = (level?: 'INFO' | 'WARN' | 'ERROR') => {
        const all = [
            ['2026-03-30 10:00:00', 'INFO', 'Auth', 'Connexion réussie', 'admin@trackyu.com'],
            ['2026-03-30 10:05:00', 'WARN', 'API', 'Limite de taux approche', 'system'],
            ['2026-03-30 10:15:00', 'INFO', 'Database', 'Sauvegarde terminée', 'system'],
            ['2026-03-30 11:00:00', 'ERROR', 'GPS Parser', 'Trame invalide reçue', 'gps-server'],
            ['2026-03-30 11:30:00', 'WARN', 'Socket', 'Déconnexion inattendue', 'system'],
        ];
        const filtered = level ? all.filter(r => r[1] === level) : all;
        return { columns: ['Date', 'Niveau', 'Source', 'Message', 'Utilisateur'], data: filtered };
    };

    const getEventsData = (type?: 'login' | 'data_changes') => {
        const login = [
            ['2026-03-30 08:00:00', 'LOGIN', 'admin@trackyu.com', 'Succès', '192.168.1.1'],
            ['2026-03-30 08:15:00', 'LOGIN', 'user1@client.com', 'Succès', '10.0.0.5'],
            ['2026-03-30 09:00:00', 'LOGOUT', 'admin@trackyu.com', '--', '192.168.1.1'],
        ];
        const changes = [
            ['2026-03-30 09:30:00', 'UPDATE_VEHICLE', 'TRK-001', 'admin@trackyu.com', 'Modification immatriculation'],
            ['2026-03-30 10:00:00', 'CREATE_ALERT', 'ALT-042', 'system', 'Création alerte vitesse'],
            ['2026-03-30 10:45:00', 'DELETE_USER', 'USR-018', 'admin@trackyu.com', 'Suppression compte'],
        ];
        if (type === 'login') return { columns: ['Date', 'Action', 'Utilisateur', 'Résultat', 'IP'], data: login };
        if (type === 'data_changes') return { columns: ['Date', 'Action', 'Cible', 'Auteur', 'Détail'], data: changes };
        return { columns: ['Date', 'Action', 'Cible', 'Utilisateur', 'IP / Détail'], data: [...login.map(r => r.slice(0, 5)), ...changes.map(r => r.slice(0, 5))] };
    };

    const getErrorsData = (source?: 'server' | 'gps') => {
        const server = [
            ['2026-03-30 11:00:00', 'ERROR', 'Express', 'Timeout connexion base de données', 'app.ts:245'],
            ['2026-03-30 11:45:00', 'ERROR', 'Auth', 'Token JWT invalide', 'authMiddleware.ts:67'],
        ];
        const gps = [
            ['2026-03-30 10:30:00', 'ERROR', 'GT06 Parser', 'CRC invalide — trame ignorée', 'gt06.ts:112'],
            ['2026-03-30 11:15:00', 'WARN', 'Teltonika', 'Timestamp hors plage', 'teltonika.ts:89'],
        ];
        const data = source === 'server' ? server : source === 'gps' ? gps : [...server, ...gps];
        return { columns: ['Date', 'Niveau', 'Source', 'Message', 'Fichier:Ligne'], data };
    };

    const getAuditLogsData = (filter?: 'admin' | 'user') => {
        const all = [
            ['2026-03-30 09:00:00', 'CREATE_VEHICLE', 'TRK-001', 'admin@trackyu.com', 'ADMIN', '192.168.1.1'],
            ['2026-03-30 09:30:00', 'UPDATE_SETTINGS', 'Global', 'admin@trackyu.com', 'ADMIN', '192.168.1.1'],
            ['2026-03-30 10:00:00', 'VIEW_REPORT', 'RPT-Fleet', 'user1@client.com', 'USER', '10.0.0.5'],
            ['2026-03-30 10:15:00', 'EXPORT_DATA', 'CSV-Trips', 'user1@client.com', 'USER', '10.0.0.5'],
        ];
        const data = filter === 'admin' ? all.filter(r => r[4] === 'ADMIN') : filter === 'user' ? all.filter(r => r[4] === 'USER') : all;
        return { columns: ['Date', 'Action', 'Cible', 'Utilisateur', 'Rôle', 'IP'], data };
    };

    const getCurrentReportData = (): { columns: string[]; data: string[][]; title: string } => {
        switch (activeItem) {
            case 'system':
                if (selectedSubReport === 'warnings') return { ...getSystemLogsData('WARN'), title: 'Avertissements système' };
                if (selectedSubReport === 'errors') return { ...getSystemLogsData('ERROR'), title: 'Erreurs système' };
                return { ...getSystemLogsData('INFO'), title: 'Logs informatifs' };
            case 'events':
                if (selectedSubReport === 'login') return { ...getEventsData('login'), title: 'Événements de connexion' };
                if (selectedSubReport === 'data_changes') return { ...getEventsData('data_changes'), title: 'Modifications de données' };
                return { ...getEventsData(), title: 'Événements système' };
            case 'errors':
                if (selectedSubReport === 'gps') return { ...getErrorsData('gps'), title: 'Erreurs GPS / Parsers' };
                return { ...getErrorsData('server'), title: 'Erreurs serveur' };
            case 'audit':
                if (selectedSubReport === 'admin') return { ...getAuditLogsData('admin'), title: "Piste d'audit — Actions admin" };
                if (selectedSubReport === 'user') return { ...getAuditLogsData('user'), title: "Piste d'audit — Actions utilisateur" };
                return { ...getAuditLogsData(), title: "Piste d'audit complète" };
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
        if (mode === 'view') { setIsGenerated(true); return; }
        const { columns, data, title } = getCurrentReportData();
        if (!columns.length) { setIsGenerated(true); return; }
        if (mode === 'pdf') handleExport(title, columns, data);
        else exportReportData(columns, data, `rapport_${activeItem}_${selectedSubReport}_${new Date().toISOString().slice(0, 10)}`, mode);
    };

    const currentSubReports = SUB_REPORTS[activeItem] || [];

    const renderContent = () => {
        const { columns, data, title } = getCurrentReportData();
        return (
            <div className="space-y-6">
                <ReportFilterBar
                    period={selectedPeriod} onPeriodChange={setSelectedPeriod}
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
                        <Card title="Erreurs (24h)">
                            <div className="text-3xl font-bold text-green-600">0</div>
                            <p className="text-sm text-slate-500">Système stable</p>
                        </Card>
                        <Card title="Actions Admin">
                            <div className="text-3xl font-bold text-[var(--primary)]">12</div>
                            <p className="text-sm text-slate-500">Dernières 24h</p>
                        </Card>
                        <Card title="Connexions Utilisateurs">
                            <div className="text-3xl font-bold text-purple-600">38</div>
                            <p className="text-sm text-slate-500">Aujourd'hui</p>
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
