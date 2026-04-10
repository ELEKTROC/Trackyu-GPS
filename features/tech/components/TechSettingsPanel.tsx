import React, { useState, useEffect, useCallback } from 'react';
import { 
    Settings, Clock, Tag, Plus, Edit2, Trash2, Save, X, 
    Eye, EyeOff, ChevronRight,
    Wrench, Download, Upload, CheckCircle, HelpCircle, 
    Cpu, Smartphone, Radio, Package, Truck, Users, Zap, MapPin, GripVertical,
    RotateCcw
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { Card } from '../../../components/Card';
import { api } from '../../../services/api';
import { useCurrency } from '../../../hooks/useCurrency';

// Icons disponibles
const AVAILABLE_ICONS: { [key: string]: React.ComponentType<any> } = {
    'Wrench': Wrench,
    'Download': Download,
    'Upload': Upload,
    'CheckCircle': CheckCircle,
    'HelpCircle': HelpCircle,
    'Settings': Settings,
    'Zap': Zap,
    'Truck': Truck,
    'MapPin': MapPin,
    'Package': Package,
    'Tag': Tag
};

// Types de matériel
const DEVICE_TYPES = [
    { value: 'BOX', label: 'Boîtier GPS', icon: Cpu },
    { value: 'SIM', label: 'Carte SIM', icon: Smartphone },
    { value: 'SENSOR', label: 'Capteur', icon: Radio },
    { value: 'ACCESSORY', label: 'Accessoire', icon: Package }
];

// Couleurs disponibles pour les types
const AVAILABLE_COLORS = [
    '#22C55E', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#14B8A6', '#6B7280', '#F97316', '#06B6D4'
];

interface InterventionType {
    id: string;
    tenant_id?: string | null;
    code: string;
    label: string;
    description?: string;
    icon: string;
    color: string;
    default_duration: number;
    base_cost: number;
    is_active: boolean;
    is_system: boolean;
    display_order: number;
}

interface InterventionNature {
    id: string;
    tenant_id?: string | null;
    type_id: string;
    code: string;
    label: string;
    description?: string;
    required_fields?: string[];
    checklist_template?: any[];
    is_active: boolean;
    is_system: boolean;
    display_order: number;
    type_label?: string;
    type_code?: string;
}

interface SlaConfig {
    id?: string;
    tenant_id?: string | null;
    criticalResponseTime: number;
    highResponseTime: number;
    mediumResponseTime: number;
    lowResponseTime: number;
    criticalCloseTime: number;
    highCloseTime: number;
    mediumCloseTime: number;
    lowCloseTime: number;
    alertBeforeDeadline: number;
    autoEscalation: boolean;
    isCustom?: boolean;
}

interface DeviceModel {
    id: string;
    tenant_id?: string | null;
    type: string;
    brand: string;
    model: string;
    protocol?: string;
    description?: string;
    specifications?: any;
    default_price: number;
    is_active: boolean;
    display_order: number;
}

interface AssignmentRule {
    id: string;
    tenant_id?: string | null;
    name: string;
    description?: string;
    priority: number;
    conditions: any;
    actions: any;
    is_active: boolean;
}

type TabType = 'types' | 'natures' | 'sla' | 'devices' | 'rules';

export const TechSettingsPanel: React.FC = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const { formatPrice, currency } = useCurrency();
    const { confirm, ConfirmDialogComponent } = useConfirmDialog();
    const [activeTab, setActiveTab] = useState<TabType>('types');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const isSuperAdmin = ['SUPERADMIN', 'SUPER_ADMIN'].includes(user?.role?.toUpperCase() || '') || user?.tenantId === 'tenant_trackyu';

    // Types State
    const [types, setTypes] = useState<InterventionType[]>([]);
    const [editingType, setEditingType] = useState<InterventionType | null>(null);
    const [newType, setNewType] = useState<Partial<InterventionType> | null>(null);

    // Natures State
    const [natures, setNatures] = useState<InterventionNature[]>([]);
    const [editingNature, setEditingNature] = useState<InterventionNature | null>(null);
    const [newNature, setNewNature] = useState<Partial<InterventionNature> | null>(null);
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');

    // SLA State
    const [slaConfig, setSlaConfig] = useState<SlaConfig>({
        criticalResponseTime: 2,
        highResponseTime: 8,
        mediumResponseTime: 24,
        lowResponseTime: 72,
        criticalCloseTime: 4,
        highCloseTime: 24,
        mediumCloseTime: 48,
        lowCloseTime: 72,
        alertBeforeDeadline: 60,
        autoEscalation: true
    });
    const [slaModified, setSlaModified] = useState(false);

    // Device Models State
    const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
    const [editingDevice, setEditingDevice] = useState<DeviceModel | null>(null);
    const [newDevice, setNewDevice] = useState<Partial<DeviceModel> | null>(null);
    const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('');

    // Assignment Rules State
    const [rules, setRules] = useState<AssignmentRule[]>([]);
    const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
    const [newRule, setNewRule] = useState<Partial<AssignmentRule> | null>(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const config = await api.techSettings.getConfig();
            setTypes(config.types || []);
            setNatures(config.natures || []);
            if (config.sla) {
                setSlaConfig({
                    criticalResponseTime: config.sla.critical_response_time || 2,
                    highResponseTime: config.sla.high_response_time || 8,
                    mediumResponseTime: config.sla.medium_response_time || 24,
                    lowResponseTime: config.sla.low_response_time || 72,
                    criticalCloseTime: config.sla.critical_close_time || 4,
                    highCloseTime: config.sla.high_close_time || 24,
                    mediumCloseTime: config.sla.medium_close_time || 48,
                    lowCloseTime: config.sla.low_close_time || 72,
                    alertBeforeDeadline: config.sla.alert_before_deadline || 60,
                    autoEscalation: config.sla.auto_escalation !== false,
                    isCustom: config.sla.is_custom
                });
            }
            setDeviceModels(config.deviceModels || []);
            setRules(config.assignmentRules || []);
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_LOAD(), 'error');
        } finally {
            setLoading(false);
        }
    };

    // ========== TYPES CRUD ==========
    const handleSaveType = async () => {
        if (!editingType && !newType) return;
        const data = editingType || newType;
        
        if (!data?.code || !data?.label) {
            showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
            return;
        }

        setSaving(true);
        try {
            if (editingType) {
                await api.techSettings.updateType(editingType.id, {
                    label: data.label,
                    description: data.description,
                    icon: data.icon,
                    color: data.color,
                    defaultDuration: data.default_duration,
                    baseCost: data.base_cost,
                    isActive: data.is_active,
                    displayOrder: data.display_order
                });
                showToast(TOAST.CRUD.UPDATED('Type'), 'success');
            } else {
                await api.techSettings.createType({
                    code: data.code,
                    label: data.label,
                    description: data.description,
                    icon: data.icon || 'Wrench',
                    color: data.color || '#3B82F6',
                    defaultDuration: data.default_duration || 60,
                    baseCost: data.base_cost || 0,
                    isActive: true,
                    displayOrder: types.length
                });
                showToast(TOAST.CRUD.CREATED('Type'), 'success');
            }
            setEditingType(null);
            setNewType(null);
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_SAVE(), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteType = async (id: string, isSystem: boolean) => {
        if (isSystem) {
            showToast('Impossible de supprimer un type système', 'error');
            return;
        }
        if (!await confirm({ message: 'Supprimer ce type d\'intervention ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) return;
        
        try {
            await api.techSettings.deleteType(id);
            showToast(TOAST.CRUD.DELETED('Type'), 'success');
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_DELETE('type'), 'error');
        }
    };

    const handleToggleType = async (type: InterventionType) => {
        try {
            await api.techSettings.updateType(type.id, { isActive: !type.is_active });
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_SAVE(), 'error');
        }
    };

    // ========== NATURES CRUD ==========
    const handleSaveNature = async () => {
        if (!editingNature && !newNature) return;
        const data = editingNature || newNature;
        
        if (!data?.code || !data?.label || !data?.type_id) {
            showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
            return;
        }

        setSaving(true);
        try {
            if (editingNature) {
                await api.techSettings.updateNature(editingNature.id, {
                    typeId: data.type_id,
                    label: data.label,
                    description: data.description,
                    requiredFields: data.required_fields,
                    checklistTemplate: data.checklist_template,
                    isActive: data.is_active,
                    displayOrder: data.display_order
                });
                showToast(TOAST.CRUD.UPDATED('Nature'), 'success');
            } else {
                await api.techSettings.createNature({
                    typeId: data.type_id,
                    code: data.code,
                    label: data.label,
                    description: data.description,
                    requiredFields: data.required_fields || [],
                    checklistTemplate: data.checklist_template || [],
                    isActive: true,
                    displayOrder: natures.length
                });
                showToast(TOAST.CRUD.CREATED('Nature'), 'success');
            }
            setEditingNature(null);
            setNewNature(null);
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_SAVE(), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteNature = async (id: string, isSystem: boolean) => {
        if (isSystem) {
            showToast('Impossible de supprimer une nature système', 'error');
            return;
        }
        if (!await confirm({ message: 'Supprimer cette nature ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) return;
        
        try {
            await api.techSettings.deleteNature(id);
            showToast(TOAST.CRUD.DELETED('Nature'), 'success');
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_DELETE('nature'), 'error');
        }
    };

    // ========== SLA SAVE ==========
    const handleSaveSla = async () => {
        setSaving(true);
        try {
            await api.techSettings.updateSla(slaConfig);
            setSlaModified(false);
            showToast(TOAST.ADMIN.CONFIG_SAVED, 'success');
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_SAVE(), 'error');
        } finally {
            setSaving(false);
        }
    };

    // ========== DEVICE MODELS CRUD ==========
    const handleSaveDevice = async () => {
        if (!editingDevice && !newDevice) return;
        const data = editingDevice || newDevice;
        
        if (!data?.type || !data?.brand || !data?.model) {
            showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
            return;
        }

        setSaving(true);
        try {
            if (editingDevice) {
                await api.techSettings.updateDeviceModel(editingDevice.id, {
                    type: data.type,
                    brand: data.brand,
                    model: data.model,
                    protocol: data.protocol || null,
                    description: data.description,
                    specifications: data.specifications,
                    defaultPrice: data.default_price,
                    isActive: data.is_active,
                    displayOrder: data.display_order
                });
                showToast(TOAST.CRUD.UPDATED('Modèle'), 'success');
            } else {
                await api.techSettings.createDeviceModel({
                    type: data.type,
                    brand: data.brand,
                    model: data.model,
                    protocol: data.protocol || null,
                    description: data.description,
                    specifications: data.specifications || {},
                    defaultPrice: data.default_price || 0,
                    isActive: true,
                    displayOrder: deviceModels.length
                });
                showToast(TOAST.CRUD.CREATED('Modèle'), 'success');
            }
            setEditingDevice(null);
            setNewDevice(null);
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_SAVE(), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDevice = async (id: string) => {
        if (!await confirm({ message: 'Supprimer ce modèle ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) return;
        try {
            await api.techSettings.deleteDeviceModel(id);
            showToast(TOAST.CRUD.DELETED('Modèle'), 'success');
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_DELETE('modèle'), 'error');
        }
    };

    // ========== ASSIGNMENT RULES CRUD ==========
    const handleSaveRule = async () => {
        if (!editingRule && !newRule) return;
        const data = editingRule || newRule;
        
        if (!data?.name) {
            showToast(TOAST.VALIDATION.REQUIRED_FIELD('nom'), 'error');
            return;
        }

        setSaving(true);
        try {
            if (editingRule) {
                await api.techSettings.updateAssignmentRule(editingRule.id, {
                    name: data.name,
                    description: data.description,
                    priority: data.priority,
                    conditions: data.conditions,
                    actions: data.actions,
                    isActive: data.is_active
                });
                showToast(TOAST.CRUD.UPDATED('Règle'), 'success');
            } else {
                await api.techSettings.createAssignmentRule({
                    name: data.name,
                    description: data.description,
                    priority: rules.length,
                    conditions: data.conditions || {},
                    actions: data.actions || {},
                    isActive: true
                });
                showToast(TOAST.CRUD.CREATED('Règle'), 'success');
            }
            setEditingRule(null);
            setNewRule(null);
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_SAVE(), 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!await confirm({ message: 'Supprimer cette règle ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) return;
        try {
            await api.techSettings.deleteAssignmentRule(id);
            showToast(TOAST.CRUD.DELETED('Règle'), 'success');
            fetchAllData();
        } catch (error) {
            showToast(TOAST.CRUD.ERROR_DELETE('règle'), 'error');
        }
    };

    // ========== RENDER TABS ==========
    const tabs = [
        { id: 'types' as TabType, label: 'Types', icon: Tag, count: types.length },
        { id: 'natures' as TabType, label: 'Natures', icon: ChevronRight, count: natures.length },
        { id: 'sla' as TabType, label: 'SLA', icon: Clock, count: null },
        { id: 'devices' as TabType, label: 'Matériel', icon: Cpu, count: deviceModels.length },
        { id: 'rules' as TabType, label: 'Règles', icon: Users, count: rules.length }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
            </div>
        );
    }

    return (
        <>
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Settings className="w-6 h-6 text-[var(--primary)]" />
                    <h2 className="text-xl font-semibold dark:text-white">Configuration Interventions</h2>
                </div>
                <button
                    onClick={fetchAllData}
                    className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    title="Rafraîchir"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="flex space-x-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                                activeTab === tab.id
                                    ? 'border-[var(--primary)] text-[var(--primary)] dark:text-[var(--primary)]'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.count !== null && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                {/* TYPES TAB */}
                {activeTab === 'types' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium dark:text-white">Types d'interventions</h3>
                            <button
                                onClick={() => setNewType({ code: '', label: '', icon: 'Wrench', color: '#3B82F6', default_duration: 60, base_cost: 0 })}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                            >
                                <Plus className="w-4 h-4" /> Nouveau type
                            </button>
                        </div>

                        {/* New Type Form */}
                        {newType && (
                            <Card className="p-4 border-2 border-[var(--primary)]">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Code (ex: INSTALLATION)"
                                        value={newType.code || ''}
                                        onChange={e => setNewType({ ...newType, code: e.target.value.toUpperCase() })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Libellé"
                                        value={newType.label || ''}
                                        onChange={e => setNewType({ ...newType, label: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Durée (min)"
                                        value={newType.default_duration || 60}
                                        onChange={e => setNewType({ ...newType, default_duration: parseInt(e.target.value) })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <select
                                        value={newType.icon || 'Wrench'}
                                        onChange={e => setNewType({ ...newType, icon: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    >
                                        {Object.keys(AVAILABLE_ICONS).map(icon => (
                                            <option key={icon} value={icon}>{icon}</option>
                                        ))}
                                    </select>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Couleur:</span>
                                        <div className="flex gap-1">
                                            {AVAILABLE_COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setNewType({ ...newType, color })}
                                                    className={`w-6 h-6 rounded-full border-2 ${newType.color === color ? 'border-slate-800 dark:border-white' : 'border-transparent'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder={`Coût de base (${currency})`}
                                        value={newType.base_cost || 0}
                                        onChange={e => setNewType({ ...newType, base_cost: parseInt(e.target.value) })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setNewType(null)} className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleSaveType} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                                        <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Créer'}
                                    </button>
                                </div>
                            </Card>
                        )}

                        {/* Types List */}
                        <div className="space-y-2">
                            {types.map(type => {
                                const IconComponent = AVAILABLE_ICONS[type.icon] || Wrench;
                                const isEditing = editingType?.id === type.id;
                                
                                return (
                                    <div
                                        key={type.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${
                                            type.is_active ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 opacity-60'
                                        }`}
                                    >
                                        {isEditing ? (
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <input
                                                    type="text"
                                                    value={editingType.label}
                                                    onChange={e => setEditingType({ ...editingType, label: e.target.value })}
                                                    className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                />
                                                <input
                                                    type="number"
                                                    value={editingType.default_duration}
                                                    onChange={e => setEditingType({ ...editingType, default_duration: parseInt(e.target.value) })}
                                                    className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                />
                                                <input
                                                    type="number"
                                                    value={editingType.base_cost}
                                                    onChange={e => setEditingType({ ...editingType, base_cost: parseInt(e.target.value) })}
                                                    className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingType(null)} className="p-2 text-slate-500 hover:text-slate-700">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={handleSaveType} disabled={saving} className="p-2 text-green-600 hover:text-green-700">
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-lg" style={{ backgroundColor: type.color + '20' }}>
                                                        <IconComponent className="w-5 h-5" style={{ color: type.color }} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium dark:text-white">{type.label}</span>
                                                            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                                                                {type.code}
                                                            </span>
                                                            {type.is_system && (
                                                                <span className="text-xs px-2 py-0.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded">
                                                                    Système
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                                            {type.default_duration} min • {formatPrice(type.base_cost)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleToggleType(type)}
                                                        className={`p-2 rounded-lg ${type.is_active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                        title={type.is_active ? 'Désactiver' : 'Activer'}
                                                    >
                                                        {type.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                                    </button>
                                                    {!type.is_system && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingType(type)}
                                                                className="p-2 text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteType(type.id, type.is_system)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* NATURES TAB */}
                {activeTab === 'natures' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <h3 className="text-lg font-medium dark:text-white">Natures d'interventions</h3>
                            <div className="flex items-center gap-4">
                                <select
                                    value={selectedTypeFilter}
                                    onChange={e => setSelectedTypeFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                >
                                    <option value="">Tous les types</option>
                                    {types.filter(t => t.is_active).map(t => (
                                        <option key={t.id} value={t.id}>{t.label}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setNewNature({ code: '', label: '', type_id: types[0]?.id || '' })}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                                >
                                    <Plus className="w-4 h-4" /> Nouvelle nature
                                </button>
                            </div>
                        </div>

                        {/* New Nature Form */}
                        {newNature && (
                            <Card className="p-4 border-2 border-[var(--primary)]">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <select
                                        value={newNature.type_id || ''}
                                        onChange={e => setNewNature({ ...newNature, type_id: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    >
                                        <option value="">Sélectionner un type</option>
                                        {types.filter(t => t.is_active).map(t => (
                                            <option key={t.id} value={t.id}>{t.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Code"
                                        value={newNature.code || ''}
                                        onChange={e => setNewNature({ ...newNature, code: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Libellé"
                                        value={newNature.label || ''}
                                        onChange={e => setNewNature({ ...newNature, label: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setNewNature(null)} className="px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleSaveNature} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                                        <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Créer'}
                                    </button>
                                </div>
                            </Card>
                        )}

                        {/* Natures List */}
                        <div className="space-y-2">
                            {natures
                                .filter(n => !selectedTypeFilter || n.type_id === selectedTypeFilter)
                                .map(nature => (
                                    <div
                                        key={nature.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${
                                            nature.is_active ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-900 opacity-60'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium dark:text-white">{nature.label}</span>
                                                <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                                                    {nature.code}
                                                </span>
                                                {nature.is_system && (
                                                    <span className="text-xs px-2 py-0.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded">
                                                        Système
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                                Type: {nature.type_label || types.find(t => t.id === nature.type_id)?.label || '-'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!nature.is_system && (
                                                <>
                                                    <button
                                                        onClick={() => setEditingNature(nature)}
                                                        className="p-2 text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteNature(nature.id, nature.is_system)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* SLA TAB */}
                {activeTab === 'sla' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-medium dark:text-white">Configuration SLA</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Définir les délais de réponse et de clôture par priorité
                                </p>
                            </div>
                            {slaConfig.isCustom && (
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                    Configuration personnalisée
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Response Times */}
                            <Card className="p-4">
                                <h4 className="font-medium mb-4 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[var(--primary)]" />
                                    Délai de réponse (heures)
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { key: 'criticalResponseTime', label: 'Critique', color: 'red' },
                                        { key: 'highResponseTime', label: 'Haute', color: 'orange' },
                                        { key: 'mediumResponseTime', label: 'Moyenne', color: 'yellow' },
                                        { key: 'lowResponseTime', label: 'Basse', color: 'green' }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between">
                                            <span className="text-sm dark:text-slate-300">{item.label}</span>
                                            <input
                                                type="number"
                                                value={(slaConfig as any)[item.key]}
                                                onChange={e => {
                                                    setSlaConfig({ ...slaConfig, [item.key]: parseInt(e.target.value) });
                                                    setSlaModified(true);
                                                }}
                                                className="w-20 px-3 py-2 border rounded-lg text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Close Times */}
                            <Card className="p-4">
                                <h4 className="font-medium mb-4 dark:text-white flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                    Délai de clôture (heures)
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { key: 'criticalCloseTime', label: 'Critique', color: 'red' },
                                        { key: 'highCloseTime', label: 'Haute', color: 'orange' },
                                        { key: 'mediumCloseTime', label: 'Moyenne', color: 'yellow' },
                                        { key: 'lowCloseTime', label: 'Basse', color: 'green' }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between">
                                            <span className="text-sm dark:text-slate-300">{item.label}</span>
                                            <input
                                                type="number"
                                                value={(slaConfig as any)[item.key]}
                                                onChange={e => {
                                                    setSlaConfig({ ...slaConfig, [item.key]: parseInt(e.target.value) });
                                                    setSlaModified(true);
                                                }}
                                                className="w-20 px-3 py-2 border rounded-lg text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>

                        {/* Additional Settings */}
                        <Card className="p-4">
                            <h4 className="font-medium mb-4 dark:text-white">Paramètres avancés</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm dark:text-slate-300">Alerte avant échéance (minutes)</span>
                                    <input
                                        type="number"
                                        value={slaConfig.alertBeforeDeadline}
                                        onChange={e => {
                                            setSlaConfig({ ...slaConfig, alertBeforeDeadline: parseInt(e.target.value) });
                                            setSlaModified(true);
                                        }}
                                        className="w-24 px-3 py-2 border rounded-lg text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm dark:text-slate-300">Escalade automatique</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={slaConfig.autoEscalation}
                                            onChange={e => {
                                                setSlaConfig({ ...slaConfig, autoEscalation: e.target.checked });
                                                setSlaModified(true);
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--primary-dim)] dark:peer-focus:ring-[var(--primary-dim)] rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[var(--primary)]"></div>
                                    </label>
                                </div>
                            </div>
                        </Card>

                        {slaModified && (
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveSla}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Enregistrement...' : 'Sauvegarder SLA'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* DEVICES TAB */}
                {activeTab === 'devices' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <h3 className="text-lg font-medium dark:text-white">Catalogue de matériel</h3>
                            <div className="flex items-center gap-4">
                                <select
                                    value={deviceTypeFilter}
                                    onChange={e => setDeviceTypeFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                >
                                    <option value="">Tous les types</option>
                                    {DEVICE_TYPES.map(dt => (
                                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setNewDevice({ type: 'BOX', brand: '', model: '', protocol: '', default_price: 0 })}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                                >
                                    <Plus className="w-4 h-4" /> Nouveau modèle
                                </button>
                            </div>
                        </div>

                        {/* New Device Form */}
                        {newDevice && (
                            <Card className="p-4 border-2 border-[var(--primary)]">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <select
                                        value={newDevice.type || 'BOX'}
                                        onChange={e => setNewDevice({ ...newDevice, type: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    >
                                        {DEVICE_TYPES.map(dt => (
                                            <option key={dt.value} value={dt.value}>{dt.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Marque"
                                        value={newDevice.brand || ''}
                                        onChange={e => setNewDevice({ ...newDevice, brand: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Modèle"
                                        value={newDevice.model || ''}
                                        onChange={e => setNewDevice({ ...newDevice, model: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                    <select
                                        value={newDevice.protocol || ''}
                                        onChange={e => setNewDevice({ ...newDevice, protocol: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    >
                                        <option value="">-- Protocole --</option>
                                        <option value="GT06">GT06</option>
                                        <option value="Teltonika">Teltonika</option>
                                        <option value="H02">H02</option>
                                        <option value="JT808">JT808</option>
                                        <option value="Meitrack">Meitrack</option>
                                        <option value="Queclink">Queclink</option>
                                        <option value="WialonIPS">Wialon IPS</option>
                                        <option value="Coban">Coban</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder={`Prix (${currency})`}
                                        value={newDevice.default_price || 0}
                                        onChange={e => setNewDevice({ ...newDevice, default_price: parseInt(e.target.value) })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setNewDevice(null)} className="px-4 py-2 text-slate-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleSaveDevice} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                        <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Créer'}
                                    </button>
                                </div>
                            </Card>
                        )}

                        {/* Devices List by Type */}
                        {DEVICE_TYPES.map(deviceType => {
                            const filteredDevices = deviceModels.filter(d => 
                                d.type === deviceType.value && (!deviceTypeFilter || deviceTypeFilter === deviceType.value)
                            );
                            if (filteredDevices.length === 0 && deviceTypeFilter) return null;
                            
                            const TypeIcon = deviceType.icon;
                            return (
                                <div key={deviceType.value} className="space-y-2">
                                    <h4 className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <TypeIcon className="w-4 h-4" />
                                        {deviceType.label} ({filteredDevices.length})
                                    </h4>
                                    {filteredDevices.map(device => (
                                        <div
                                            key={device.id}
                                            className={`flex items-center justify-between p-4 rounded-lg border ${
                                                device.is_active ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'opacity-60'
                                            }`}
                                        >
                                            <div>
                                                <div className="font-medium dark:text-white">
                                                    {device.brand} {device.model}
                                                    {device.protocol && (
                                                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]">
                                                            {device.protocol}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                                    {formatPrice(device.default_price)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setEditingDevice(device)}
                                                    className="p-2 text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDevice(device.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* RULES TAB */}
                {activeTab === 'rules' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-medium dark:text-white">Règles d'assignation</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Automatiser l'assignation des interventions aux techniciens
                                </p>
                            </div>
                            <button
                                onClick={() => setNewRule({ name: '', description: '', priority: rules.length })}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                            >
                                <Plus className="w-4 h-4" /> Nouvelle règle
                            </button>
                        </div>

                        {/* New Rule Form */}
                        {newRule && (
                            <Card className="p-4 border-2 border-[var(--primary)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Nom de la règle"
                                        value={newRule.name || ''}
                                        onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Description"
                                        value={newRule.description || ''}
                                        onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                                        className="px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button onClick={() => setNewRule(null)} className="px-4 py-2 text-slate-600">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleSaveRule} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                        <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Créer'}
                                    </button>
                                </div>
                            </Card>
                        )}

                        {/* Rules List */}
                        {rules.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Aucune règle d'assignation configurée</p>
                                <p className="text-sm">Les interventions seront assignées manuellement</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {rules.map((rule, index) => (
                                    <div
                                        key={rule.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${
                                            rule.is_active ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-slate-400">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                            <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">
                                                #{index + 1}
                                            </span>
                                            <div>
                                                <div className="font-medium dark:text-white">{rule.name}</div>
                                                {rule.description && (
                                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                                        {rule.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setEditingRule(rule)}
                                                className="p-2 text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
        <ConfirmDialogComponent />
        </>
    );
};
