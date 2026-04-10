import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Clock,
  Tag,
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Wrench,
  MessageSquare,
  Bug,
  HelpCircle,
  Zap,
  Shield,
  FileText,
  AlertTriangle,
  Lock,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { Card } from '../../../components/Card';
import { api } from '../../../services/apiLazy';
import { logger } from '../../../utils/logger';

// Icons disponibles pour les catégories
const AVAILABLE_ICONS: { [key: string]: React.ComponentType<any> } = {
  Wrench: Wrench,
  MessageSquare: MessageSquare,
  Bug: Bug,
  HelpCircle: HelpCircle,
  Zap: Zap,
  Shield: Shield,
  FileText: FileText,
  AlertTriangle: AlertTriangle,
  Tag: Tag,
  Settings: Settings,
};

interface SlaConfig {
  id?: number;
  tenant_id?: string | null;
  critical: number;
  high: number;
  medium: number;
  low: number;
  is_custom?: boolean;
}

interface Category {
  id: number;
  tenant_id?: string | null;
  name: string;
  icon: string;
  is_active: boolean;
  is_system: boolean;
  is_hidden?: boolean;
  description?: string;
  display_order?: number;
  subcategory_count?: number;
  can_edit?: boolean;
  can_delete?: boolean;
  can_hide?: boolean;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  default_priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sla_hours: number;
  is_active: boolean;
  is_system: boolean;
  is_hidden?: boolean;
  description?: string;
  category_name?: string;
  can_edit?: boolean;
  can_delete?: boolean;
  can_hide?: boolean;
}

interface InterventionTypeConfig {
  id: string;
  code: string;
  label: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
}

interface InterventionNatureConfig {
  id: string;
  typeId: string;
  code: string;
  label: string;
  isActive: boolean;
  isSystem: boolean;
}

type TabType = 'sla' | 'categories' | 'subcategories' | 'interventions';

export const SupportSettingsPanel: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [activeTab, setActiveTab] = useState<TabType>('sla');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if user is SuperAdmin (can manage system categories)
  const normalizedRole = user?.role?.toUpperCase().replace(/_/g, '');
  const isSuperAdmin = normalizedRole === 'SUPERADMIN' || user?.tenantId === 'tenant_trackyu';

  // SLA State
  const [slaConfig, setSlaConfig] = useState<SlaConfig>({
    critical: 4,
    high: 24,
    medium: 48,
    low: 72,
  });
  const [slaModified, setSlaModified] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<Category> | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // Subcategories State
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [newSubcategory, setNewSubcategory] = useState<Partial<Subcategory> | null>(null);

  // Intervention State
  const [interventionTypes, setInterventionTypes] = useState<InterventionTypeConfig[]>([]);
  const [interventionNatures, setInterventionNatures] = useState<InterventionNatureConfig[]>([]);
  const [editingIntType, setEditingIntType] = useState<InterventionTypeConfig | null>(null);
  const [newIntType, setNewIntType] = useState<Partial<InterventionTypeConfig> | null>(null);
  const [editingIntNature, setEditingIntNature] = useState<InterventionNatureConfig | null>(null);
  const [newIntNature, setNewIntNature] = useState<Partial<InterventionNatureConfig> | null>(null);
  const [expandedIntTypes, setExpandedIntTypes] = useState<Set<string>>(new Set());

  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSlaConfig(), fetchCategories(), fetchSubcategories(), fetchInterventionSettings()]);
    } catch (error) {
      logger.error('Error fetching data:', error);
      showToast(TOAST.CRUD.ERROR_LOAD('données'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Alias for use in handlers
  const loadData = fetchAllData;

  const resetOverrides = async () => {
    await api.adminFeatures.supportSettings.resetOverrides('all');
  };

  const fetchSlaConfig = async () => {
    try {
      const data = await api.adminFeatures.supportSettings.getSlaConfig();
      setSlaConfig(data);
    } catch (error) {
      logger.error('Error fetching SLA config:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.adminFeatures.supportSettings.getCategories(true);
      setCategories(data);
    } catch (error) {
      logger.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const data = await api.adminFeatures.supportSettings.getSubCategories(undefined, true);
      setSubcategories(data);
    } catch (error) {
      logger.error('Error fetching subcategories:', error);
    }
  };

  const fetchInterventionSettings = async () => {
    try {
      const [types, natures] = await Promise.all([api.techSettings.getTypes(), api.techSettings.getNatures()]);
      setInterventionTypes(types || []);
      setInterventionNatures(natures || []);
    } catch (error) {
      logger.error('Error fetching intervention settings:', error);
    }
  };

  // SLA handlers
  const handleSlaChange = (priority: keyof SlaConfig, value: number) => {
    setSlaConfig((prev) => ({ ...prev, [priority]: value }));
    setSlaModified(true);
  };

  const saveSlaConfig = async () => {
    setSaving(true);
    try {
      await api.adminFeatures.supportSettings.updateSlaConfig(slaConfig);
      showToast(TOAST.ADMIN.CONFIG_SAVED, 'success');
      setSlaModified(false);
    } catch (error) {
      showToast(mapError(error, 'configuration SLA'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Category handlers
  const saveCategory = async (category: Partial<Category>) => {
    setSaving(true);
    try {
      const isNew = !category.id;
      if (isNew) {
        await api.adminFeatures.supportSettings.createCategory(category);
      } else {
        await api.adminFeatures.supportSettings.updateCategory(category.id!, category);
      }
      showToast(isNew ? TOAST.CRUD.CREATED('Catégorie') : TOAST.CRUD.UPDATED('Catégorie'), 'success');
      await fetchCategories();
      setEditingCategory(null);
      setNewCategory(null);
    } catch (error) {
      showToast(mapError(error, 'catégorie'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoryActive = async (category: Category) => {
    await saveCategory({ ...category, is_active: !category.is_active });
  };

  const deleteCategory = async (category: Category) => {
    if (
      !(await confirm({
        message: `Voulez-vous vraiment désactiver la catégorie "${category.name}" ?`,
        variant: 'warning',
        title: 'Confirmer la désactivation',
        confirmLabel: 'Désactiver',
      }))
    )
      return;

    setSaving(true);
    try {
      await api.adminFeatures.supportSettings.deleteCategory(category.id);
      showToast(TOAST.CRUD.DEACTIVATED('Catégorie'), 'success');
      await fetchCategories();
    } catch (error: unknown) {
      showToast(mapError(error, 'catégorie'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Subcategory handlers
  const saveSubcategory = async (subcategory: Partial<Subcategory>) => {
    setSaving(true);
    try {
      const isNew = !subcategory.id;
      if (isNew) {
        await api.adminFeatures.supportSettings.createSubCategory(subcategory);
      } else {
        await api.adminFeatures.supportSettings.updateSubCategory(subcategory.id!, subcategory);
      }
      showToast(isNew ? TOAST.CRUD.CREATED('Sous-catégorie') : TOAST.CRUD.UPDATED('Sous-catégorie'), 'success');
      await fetchSubcategories();
      setEditingSubcategory(null);
      setNewSubcategory(null);
    } catch (error) {
      showToast(mapError(error, 'sous-catégorie'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubcategoryActive = async (subcategory: Subcategory) => {
    await saveSubcategory({ ...subcategory, is_active: !subcategory.is_active });
  };

  const deleteSubcategory = async (subcategory: Subcategory) => {
    if (
      !(await confirm({
        message: `Voulez-vous vraiment désactiver "${subcategory.name}" ?`,
        variant: 'warning',
        title: 'Confirmer la désactivation',
        confirmLabel: 'Désactiver',
      }))
    )
      return;

    setSaving(true);
    try {
      await api.adminFeatures.supportSettings.deleteSubCategory(subcategory.id);
      showToast(TOAST.CRUD.DEACTIVATED('Sous-catégorie'), 'success');
      await fetchSubcategories();
    } catch (error) {
      showToast(mapError(error, 'sous-catégorie'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Intervention handlers
  const saveIntType = async (type: Partial<InterventionTypeConfig>) => {
    setSaving(true);
    try {
      const isNew = !type.id;
      if (isNew) {
        await api.techSettings.createType(type);
      } else {
        await api.techSettings.updateType(type.id!, type);
      }
      showToast(
        isNew ? TOAST.CRUD.CREATED("Type d'intervention") : TOAST.CRUD.UPDATED("Type d'intervention"),
        'success'
      );
      await fetchInterventionSettings();
      setEditingIntType(null);
      setNewIntType(null);
    } catch (error) {
      showToast(mapError(error, "type d'intervention"), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteIntType = async (typeId: string) => {
    if (
      !(await confirm({
        message: "Voulez-vous vraiment supprimer ce type d'intervention ?",
        variant: 'danger',
        title: 'Confirmer la suppression',
      }))
    )
      return;
    setSaving(true);
    try {
      await api.techSettings.deleteType(typeId);
      showToast(TOAST.CRUD.DELETED("Type d'intervention"), 'success');
      await fetchInterventionSettings();
    } catch (error) {
      showToast(mapError(error, "type d'intervention"), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveIntNature = async (nature: Partial<InterventionNatureConfig>) => {
    setSaving(true);
    try {
      const isNew = !nature.id;
      if (isNew) {
        await api.techSettings.createNature(nature);
      } else {
        await api.techSettings.updateNature(nature.id!, nature);
      }
      showToast(
        isNew ? TOAST.CRUD.CREATED("Nature d'intervention") : TOAST.CRUD.UPDATED("Nature d'intervention"),
        'success'
      );
      await fetchInterventionSettings();
      setEditingIntNature(null);
      setNewIntNature(null);
    } catch (error) {
      showToast(mapError(error, "nature d'intervention"), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteIntNature = async (natureId: string) => {
    if (
      !(await confirm({
        message: 'Voulez-vous vraiment supprimer cette nature ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
      }))
    )
      return;
    setSaving(true);
    try {
      await api.techSettings.deleteNature(natureId);
      showToast(TOAST.CRUD.DELETED("Nature d'intervention"), 'success');
      await fetchInterventionSettings();
    } catch (error) {
      showToast(mapError(error, "nature d'intervention"), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper to get icon component
  const getIconComponent = (iconName: string) => {
    return AVAILABLE_ICONS[iconName] || Tag;
  };

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400';
    }
  };

  // Render SLA Tab
  const renderSlaTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Configuration des délais SLA</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Définissez le temps de réponse maximum pour chaque niveau de priorité
          </p>
        </div>
        {slaModified && (
          <button
            onClick={saveSlaConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Critical */}
        <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="font-medium text-red-700 dark:text-red-400">CRITIQUE</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="168"
              value={slaConfig.critical}
              onChange={(e) => handleSlaChange('critical', parseInt(e.target.value) || 4)}
              className="w-24 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
              title="Délai SLA critique en heures"
              aria-label="Délai SLA critique"
            />
            <span className="text-slate-600 dark:text-slate-400">heures</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Problèmes bloquants nécessitant une action immédiate</p>
        </div>

        {/* High */}
        <div className="p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="font-medium text-orange-700 dark:text-orange-400">HAUTE</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="168"
              value={slaConfig.high}
              onChange={(e) => handleSlaChange('high', parseInt(e.target.value) || 24)}
              className="w-24 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
              title="Délai SLA haute priorité en heures"
              aria-label="Délai SLA haute priorité"
            />
            <span className="text-slate-600 dark:text-slate-400">heures</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Problèmes importants impactant l'activité</p>
        </div>

        {/* Medium */}
        <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="font-medium text-yellow-700 dark:text-yellow-400">MOYENNE</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="336"
              value={slaConfig.medium}
              onChange={(e) => handleSlaChange('medium', parseInt(e.target.value) || 48)}
              className="w-24 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
              title="Délai SLA moyenne priorité en heures"
              aria-label="Délai SLA moyenne priorité"
            />
            <span className="text-slate-600 dark:text-slate-400">heures</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Demandes standard avec délai raisonnable</p>
        </div>

        {/* Low */}
        <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-700 dark:text-green-400">BASSE</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="720"
              value={slaConfig.low}
              onChange={(e) => handleSlaChange('low', parseInt(e.target.value) || 72)}
              className="w-24 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
              title="Délai SLA basse priorité en heures"
              aria-label="Délai SLA basse priorité"
            />
            <span className="text-slate-600 dark:text-slate-400">heures</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Demandes non urgentes, améliorations</p>
        </div>
      </div>
    </div>
  );

  // Render Categories Tab
  const renderCategoriesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Catégories de tickets</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gérez les catégories principales des tickets</p>
        </div>
        <button
          onClick={() => setNewCategory({ name: '', icon: 'Tag', is_active: true })}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
        >
          <Plus className="w-4 h-4" />
          Nouvelle catégorie
        </button>
      </div>

      {/* New Category Form */}
      {newCategory && (
        <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg">
          <h4 className="font-medium mb-3">Nouvelle catégorie</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Nom de la catégorie"
              value={newCategory.name || ''}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
            />
            <select
              value={newCategory.icon || 'Tag'}
              onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
              className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
              title="Sélectionner l'icône de la catégorie"
            >
              {Object.keys(AVAILABLE_ICONS).map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => saveCategory(newCategory)}
                disabled={!newCategory.name || saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Créer
              </button>
              <button
                onClick={() => setNewCategory(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-2">
        {categories.map((category) => {
          const IconComponent = getIconComponent(category.icon);
          const isEditing = editingCategory?.id === category.id;

          return (
            <div
              key={category.id}
              className={`p-4 border rounded-lg transition-colors ${
                category.is_active
                  ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 opacity-60'
              }`}
            >
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
                    title="Nom de la catégorie"
                    placeholder="Nom de la catégorie"
                  />
                  <select
                    value={editingCategory.icon}
                    onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                    className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
                    title="Icône de la catégorie"
                  >
                    {Object.keys(AVAILABLE_ICONS).map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveCategory(editingCategory)}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                    >
                      <Check className="w-4 h-4" />
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      title="Annuler"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconComponent className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-white">{category.name}</span>
                    {category.is_system && (
                      <span className="text-xs px-2 py-1 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-full flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Système
                      </span>
                    )}
                    {category.subcategory_count !== undefined && category.subcategory_count > 0 && (
                      <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">
                        {category.subcategory_count} sous-catégorie{category.subcategory_count > 1 ? 's' : ''}
                      </span>
                    )}
                    {!category.is_active && (
                      <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                        Désactivée
                      </span>
                    )}
                    {category.is_hidden && (
                      <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
                        Masquée
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {category.can_hide && (
                      <button
                        onClick={() => toggleCategoryActive(category)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        title={category.is_hidden ? 'Afficher' : 'Masquer pour votre organisation'}
                      >
                        {category.is_hidden ? (
                          <Eye className="w-4 h-4 text-slate-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    )}
                    {category.can_edit ? (
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4 text-[var(--primary)]" />
                      </button>
                    ) : (
                      <span className="p-2" title="Catégorie système non modifiable">
                        <Lock className="w-4 h-4 text-slate-300" />
                      </span>
                    )}
                    {category.can_delete ? (
                      <button
                        onClick={() => deleteCategory(category)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render Subcategories Tab
  const renderSubcategoriesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Sous-catégories de tickets</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gérez les sous-catégories avec leur priorité et SLA par défaut
          </p>
        </div>
        <button
          onClick={() =>
            setNewSubcategory({
              name: '',
              category_id: categories.find((c) => c.is_active)?.id || categories[0]?.id,
              default_priority: 'MEDIUM',
              sla_hours: 48,
              is_active: true,
            })
          }
          disabled={categories.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Nouvelle sous-catégorie
        </button>
      </div>

      {/* New Subcategory Form */}
      {newSubcategory && (
        <div className="p-4 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--border)] dark:border-[var(--primary)] rounded-lg">
          <h4 className="font-medium mb-3">Nouvelle sous-catégorie</h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <select
              value={newSubcategory.category_id || ''}
              onChange={(e) => setNewSubcategory({ ...newSubcategory, category_id: parseInt(e.target.value) })}
              className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
              title="Catégorie parente"
            >
              <option value="">Catégorie parente...</option>
              {categories
                .filter((c) => c.is_active)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <input
              type="text"
              placeholder="Nom"
              value={newSubcategory.name || ''}
              onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
              className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
            />
            <select
              value={newSubcategory.default_priority || 'MEDIUM'}
              onChange={(e) =>
                setNewSubcategory({
                  ...newSubcategory,
                  default_priority: e.target.value as Subcategory['default_priority'],
                })
              }
              className="px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
              title="Priorité par défaut"
            >
              <option value="CRITICAL">Critique</option>
              <option value="HIGH">Haute</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="LOW">Basse</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="SLA"
                min="1"
                value={newSubcategory.sla_hours || 48}
                onChange={(e) => setNewSubcategory({ ...newSubcategory, sla_hours: parseInt(e.target.value) })}
                className="w-20 px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-600"
                title="Délai SLA en heures"
              />
              <span className="text-sm text-slate-500">h</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveSubcategory(newSubcategory)}
                disabled={!newSubcategory.name || !newSubcategory.category_id || saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
                title="Créer la sous-catégorie"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setNewSubcategory(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                title="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategories grouped by category */}
      {categories.map((category) => {
        const categorySubcats = subcategories.filter((sc) => sc.category_id === category.id);
        if (categorySubcats.length === 0 && !category.is_active) return null;

        const IconComponent = getIconComponent(category.icon);
        const isExpanded = expandedCategories.has(category.id);

        return (
          <div key={category.id} className="border rounded-lg dark:border-slate-700">
            <button
              onClick={() => {
                const newExpanded = new Set(expandedCategories);
                if (isExpanded) {
                  newExpanded.delete(category.id);
                } else {
                  newExpanded.add(category.id);
                }
                setExpandedCategories(newExpanded);
              }}
              className={`w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                !category.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <IconComponent className="w-4 h-4 text-slate-500" />
                <span className="font-medium">{category.name}</span>
                <span className="text-xs text-slate-500">({categorySubcats.length})</span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t dark:border-slate-700">
                {categorySubcats.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 text-center">Aucune sous-catégorie</p>
                ) : (
                  categorySubcats.map((subcat) => {
                    const isEditing = editingSubcategory?.id === subcat.id;

                    return (
                      <div
                        key={subcat.id}
                        className={`p-3 border-b last:border-b-0 dark:border-slate-700 ${
                          !subcat.is_active ? 'opacity-50 bg-slate-50 dark:bg-slate-900' : ''
                        }`}
                      >
                        {isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <select
                              value={editingSubcategory.category_id}
                              onChange={(e) =>
                                setEditingSubcategory({
                                  ...editingSubcategory,
                                  category_id: parseInt(e.target.value),
                                })
                              }
                              className="px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-600 text-sm"
                              title="Catégorie parente"
                            >
                              {categories
                                .filter((c) => c.is_active)
                                .map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                            </select>
                            <input
                              type="text"
                              value={editingSubcategory.name}
                              onChange={(e) =>
                                setEditingSubcategory({
                                  ...editingSubcategory,
                                  name: e.target.value,
                                })
                              }
                              className="px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-600 text-sm"
                              title="Nom de la sous-catégorie"
                              placeholder="Nom"
                            />
                            <select
                              value={editingSubcategory.default_priority}
                              onChange={(e) =>
                                setEditingSubcategory({
                                  ...editingSubcategory,
                                  default_priority: e.target.value as Subcategory['default_priority'],
                                })
                              }
                              className="px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-600 text-sm"
                              title="Priorité par défaut"
                            >
                              <option value="CRITICAL">Critique</option>
                              <option value="HIGH">Haute</option>
                              <option value="MEDIUM">Moyenne</option>
                              <option value="LOW">Basse</option>
                            </select>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={editingSubcategory.sla_hours}
                                onChange={(e) =>
                                  setEditingSubcategory({
                                    ...editingSubcategory,
                                    sla_hours: parseInt(e.target.value),
                                  })
                                }
                                className="w-16 px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-600 text-sm"
                                title="Délai SLA en heures"
                              />
                              <span className="text-xs">h</span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveSubcategory(editingSubcategory)}
                                className="flex-1 px-2 py-1 bg-[var(--primary)] text-white rounded text-sm"
                                title="Enregistrer"
                              >
                                <Check className="w-4 h-4 mx-auto" />
                              </button>
                              <button
                                onClick={() => setEditingSubcategory(null)}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded"
                                title="Annuler"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-900 dark:text-white">{subcat.name}</span>
                              {subcat.is_system && (
                                <span className="text-xs px-1.5 py-0.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-full flex items-center gap-1">
                                  <Globe className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(subcat.default_priority)}`}
                              >
                                {subcat.default_priority}
                              </span>
                              <span className="text-xs text-slate-500">SLA: {subcat.sla_hours}h</span>
                              {!subcat.is_active && (
                                <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full">
                                  Désactivée
                                </span>
                              )}
                              {subcat.is_hidden && (
                                <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full">
                                  Masquée
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {subcat.can_hide && (
                                <button
                                  onClick={() => toggleSubcategoryActive(subcat)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                  title={subcat.is_hidden ? 'Afficher' : 'Masquer'}
                                >
                                  {subcat.is_hidden ? (
                                    <Eye className="w-4 h-4 text-slate-500" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                              )}
                              {subcat.can_edit ? (
                                <button
                                  onClick={() => setEditingSubcategory(subcat)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-4 h-4 text-[var(--primary)]" />
                                </button>
                              ) : (
                                <span className="p-1.5" title="Élément système">
                                  <Lock className="w-3.5 h-3.5 text-slate-300" />
                                </span>
                              )}
                              {subcat.can_delete && (
                                <button
                                  onClick={() => deleteSubcategory(subcat)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                  title="Désactiver"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Render Interventions Tab
  const renderInterventionsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Configuration des Interventions</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gérez les types et natures d'interventions techniques
          </p>
        </div>
        <button
          onClick={() => setNewIntType({ code: '', label: '', isActive: true, isSystem: false })}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
        >
          <Plus className="w-4 h-4" />
          Nouveau type
        </button>
      </div>

      {/* New Type Form */}
      {newIntType && (
        <Card className="p-4 border-dashed border-2 border-[var(--border)] bg-[var(--primary-dim)]/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Code (ex: INSTALL)"
              value={newIntType.code || ''}
              onChange={(e) => setNewIntType({ ...newIntType, code: e.target.value.toUpperCase() })}
              className="px-3 py-2 border rounded-lg dark:bg-slate-800"
            />
            <input
              type="text"
              placeholder="Libellé (ex: Installation)"
              value={newIntType.label || ''}
              onChange={(e) => setNewIntType({ ...newIntType, label: e.target.value })}
              className="px-3 py-2 border rounded-lg dark:bg-slate-800"
            />
            <div className="flex gap-2">
              <button
                onClick={() => saveIntType(newIntType)}
                className="flex-1 bg-[var(--primary)] text-white rounded-lg py-2 font-medium hover:bg-[var(--primary-light)]"
              >
                Créer
              </button>
              <button
                onClick={() => setNewIntType(null)}
                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Types & Natures List */}
      <div className="space-y-4">
        {interventionTypes.map((type) => {
          const isExpanded = expandedIntTypes.has(type.id);
          const typeNatures = interventionNatures.filter((n) => n.typeId === type.id);
          const isEditing = editingIntType?.id === type.id;

          return (
            <div key={type.id} className="border rounded-xl dark:border-slate-700 overflow-hidden">
              <div
                className={`p-4 flex items-center justify-between ${isExpanded ? 'bg-slate-50 dark:bg-slate-800' : 'bg-white dark:bg-slate-900'}`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const next = new Set(expandedIntTypes);
                      if (isExpanded) next.delete(type.id);
                      else next.add(type.id);
                      setExpandedIntTypes(next);
                    }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                  >
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingIntType.label}
                        onChange={(e) => setEditingIntType({ ...editingIntType, label: e.target.value })}
                        className="px-2 py-1 border rounded text-sm dark:bg-slate-800"
                      />
                      <button onClick={() => saveIntType(editingIntType)} className="p-1 text-green-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingIntType(null)} className="p-1 text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-white">{type.label}</span>
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 uppercase">
                        {type.code}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setNewIntNature({ typeId: type.id, code: '', label: '', isActive: true, isSystem: false })
                    }
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] hover:bg-[var(--primary-dim)] rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une nature
                  </button>
                  <button
                    onClick={() => setEditingIntType(type)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!type.isSystem && (
                    <button
                      onClick={() => deleteIntType(type.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 bg-white dark:bg-slate-900 border-t dark:border-slate-700 space-y-3">
                  {/* New Nature Form */}
                  {newIntNature && newIntNature.typeId === type.id && (
                    <div className="flex items-center gap-3 p-3 bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)] rounded-lg border border-[var(--primary)] dark:border-[var(--primary)]/30">
                      <input
                        type="text"
                        placeholder="Code nature"
                        value={newIntNature.code || ''}
                        onChange={(e) => setNewIntNature({ ...newIntNature, code: e.target.value })}
                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Libellé nature"
                        value={newIntNature.label || ''}
                        onChange={(e) => setNewIntNature({ ...newIntNature, label: e.target.value })}
                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-slate-800"
                      />
                      <button
                        onClick={() => saveIntNature(newIntNature)}
                        className="p-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setNewIntNature(null)}
                        className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {typeNatures.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-500 italic">Aucune nature définie pour ce type</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {typeNatures.map((nature) => (
                        <div
                          key={nature.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                        >
                          {editingIntNature?.id === nature.id ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={editingIntNature.label}
                                onChange={(e) => setEditingIntNature({ ...editingIntNature, label: e.target.value })}
                                className="flex-1 px-2 py-1 border rounded text-xs dark:bg-slate-800"
                              />
                              <button onClick={() => saveIntNature(editingIntNature)} className="text-green-600">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingIntNature(null)} className="text-red-600">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {nature.label}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingIntNature(nature)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {!nature.isSystem && (
                                  <button
                                    onClick={() => deleteIntNature(nature.id)}
                                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400 group"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  const handleResetOverrides = async () => {
    if (
      !(await confirm({
        message:
          'Êtes-vous sûr de vouloir réinitialiser toutes les catégories aux valeurs système ? Vos personnalisations seront perdues.',
        variant: 'warning',
        title: 'Confirmer la réinitialisation',
        confirmLabel: 'Réinitialiser',
      }))
    ) {
      return;
    }
    try {
      await resetOverrides();
      showToast(TOAST.ADMIN.CONFIG_RESET, 'success');
      loadData();
    } catch (error) {
      logger.error('Error resetting overrides:', error);
      showToast(mapError(error, 'configuration'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-[var(--primary)]" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuration du support</h2>
          {isSuperAdmin && (
            <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Mode SuperAdmin
            </span>
          )}
        </div>
        {!isSuperAdmin && (
          <button
            onClick={handleResetOverrides}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Réinitialiser aux valeurs système par défaut"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('sla')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'sla'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Configuration SLA
            </div>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'categories'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Catégories ({categories.filter((c) => c.is_active).length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('subcategories')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'subcategories'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4" />
              Sous-catégories ({subcategories.filter((s) => s.is_active).length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('interventions')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'interventions'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Configuration Interventions
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <Card className="p-6">
        {activeTab === 'sla' && renderSlaTab()}
        {activeTab === 'categories' && renderCategoriesTab()}
        {activeTab === 'subcategories' && renderSubcategoriesTab()}
        {activeTab === 'interventions' && renderInterventionsTab()}
      </Card>
      <ConfirmDialogComponent />
    </div>
  );
};

export default SupportSettingsPanel;
