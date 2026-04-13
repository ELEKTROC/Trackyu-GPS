/**
 * MessageTemplatesPanel - Panneau de gestion des modèles de messages
 *
 * Fonctionnalités:
 * - CRUD templates de messages (Email, SMS, WhatsApp, Telegram)
 * - Catégories: Paiements, Commercial, Facturation, Interventions, Alertes, Système
 * - Variables dynamiques avec insertion
 * - Prévisualisation avec données d'exemple
 * - Templates par défaut pré-configurés
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Search,
  Filter,
  Send,
  Mail,
  MessageSquare,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Code,
  Zap,
  Clock,
  Bell,
  CreditCard,
  TrendingUp,
  Receipt,
  Wrench,
  AlertTriangle,
  Settings,
  RefreshCw,
  Download,
  Upload,
  ToggleLeft,
  ToggleRight,
  Smartphone,
  Hash,
} from 'lucide-react';
import { Card } from '../../../../components/Card';
import { Modal } from '../../../../components/Modal';
import { useToast } from '../../../../contexts/ToastContext';
import { useConfirmDialog } from '../../../../components/ConfirmDialog';
import { TOAST } from '../../../../constants/toastMessages';
import { mapError } from '../../../../utils/errorMapper';
import { api } from '../../../../services/apiLazy';
import type { MessageTemplate, MessageCategory, MessageChannel, MessageTrigger } from './types';
import { MESSAGE_CATEGORIES, MESSAGE_CHANNELS, TEMPLATE_VARIABLES, getCategoryIcon, getChannelIcon } from './constants';

// API service with field mapping (backend channel → frontend type)
const apiService = {
  list: async (): Promise<MessageTemplate[]> => {
    const data = await api.messageTemplates.list();
    return data.map((t: { channel: string; variables?: string[] }) => ({
      ...t,
      type: t.channel,
      variables: t.variables || [],
    }));
  },

  create: async (data: Partial<MessageTemplate>): Promise<MessageTemplate> => {
    const payload = {
      name: data.name,
      category: data.category,
      channel: data.channel,
      trigger: data.trigger,
      subject: data.subject,
      content: data.content,
      is_active: data.is_active !== false,
      delay_days: data.delay_days,
    };
    const created = await api.messageTemplates.create(payload);
    return { ...created, type: created.channel, variables: created.variables || [] };
  },

  update: async (id: string, data: Partial<MessageTemplate>): Promise<MessageTemplate> => {
    const payload = {
      name: data.name,
      category: data.category,
      channel: data.channel,
      trigger: data.trigger,
      subject: data.subject,
      content: data.content,
      is_active: data.is_active,
      delay_days: data.delay_days,
    };
    const updated = await api.messageTemplates.update(id, payload);
    return { ...updated, type: updated.channel, variables: updated.variables || [] };
  },

  delete: async (id: string): Promise<void> => {
    await api.messageTemplates.delete(id);
  },

  duplicate: async (id: string): Promise<MessageTemplate> => {
    const duplicated = await api.messageTemplates.duplicate(id);
    return { ...duplicated, type: duplicated.channel, variables: duplicated.variables || [] };
  },
};

export const MessageTemplatesPanel: React.FC = () => {
  // State
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<MessageCategory | 'ALL'>('ALL');
  const [filterChannel, setFilterChannel] = useState<MessageChannel | 'ALL'>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);
  const [activeVariableCategory, setActiveVariableCategory] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<MessageTemplate>>({
    name: '',
    category: 'PAYMENT',
    channel: 'EMAIL',
    trigger: 'MANUAL',
    subject: '',
    content: '',
    variables: [],
    is_active: true,
    is_system: false,
  });

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Charger les templates
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await apiService.list();
      setTemplates(data);
    } catch (error) {
      showToast(TOAST.CRUD.ERROR_LOAD('templates'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
      const matchesChannel = filterChannel === 'ALL' || t.channel === filterChannel;
      return matchesSearch && matchesCategory && matchesChannel;
    });
  }, [templates, searchQuery, filterCategory, filterChannel]);

  // Grouper par catégorie
  const templatesByCategory = useMemo(() => {
    const grouped: Record<MessageCategory, MessageTemplate[]> = {
      PAYMENT: [],
      COMMERCIAL: [],
      INVOICE: [],
      INTERVENTION: [],
      ALERT: [],
      SYSTEM: [],
    };

    filteredTemplates.forEach((t) => {
      if (grouped[t.category]) {
        grouped[t.category].push(t);
      }
    });

    return grouped;
  }, [filteredTemplates]);

  // Variables disponibles pour la catégorie actuelle
  const availableVariables = useMemo(() => {
    const category = formData.category || 'PAYMENT';
    const vars = TEMPLATE_VARIABLES[category] || [];

    // Grouper par catégorie de variable
    const grouped: Record<string, typeof vars> = {};
    vars.forEach((v) => {
      if (!grouped[v.category]) {
        grouped[v.category] = [];
      }
      grouped[v.category].push(v);
    });

    return grouped;
  }, [formData.category]);

  // Prévisualisation avec variables remplacées
  const previewContent = useMemo(() => {
    if (!previewTemplate) return { subject: '', content: '' };

    let subject = previewTemplate.subject || '';
    let content = previewTemplate.content || '';

    const vars = TEMPLATE_VARIABLES[previewTemplate.category] || [];
    vars.forEach((v) => {
      const regex = new RegExp(v.key.replace(/[{}]/g, '\\$&'), 'g');
      subject = subject.replace(regex, v.example);
      content = content.replace(regex, v.example);
    });

    return { subject, content };
  }, [previewTemplate]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Extraire les variables utilisées
      const allContent = (formData.subject || '') + (formData.content || '');
      const usedVariables: string[] = [];
      const variableRegex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = variableRegex.exec(allContent)) !== null) {
        if (!usedVariables.includes(match[0])) {
          usedVariables.push(match[0]);
        }
      }

      const dataToSave = { ...formData, variables: usedVariables };

      if (editingTemplate) {
        await apiService.update(editingTemplate.id, dataToSave);
        showToast(TOAST.ADMIN.TEMPLATE_UPDATED, 'success');
      } else {
        await apiService.create(dataToSave);
        showToast(TOAST.ADMIN.TEMPLATE_CREATED, 'success');
      }

      setIsModalOpen(false);
      fetchTemplates();
      resetForm();
    } catch (error) {
      showToast(mapError(error, 'template'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (template?.is_system) {
      showToast('Impossible de supprimer un template système', 'error');
      return;
    }
    if (
      !(await confirm({
        message: 'Êtes-vous sûr de vouloir supprimer ce template ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      }))
    )
      return;

    try {
      await apiService.delete(id);
      showToast(TOAST.ADMIN.TEMPLATE_DELETED, 'success');
      fetchTemplates();
    } catch (error) {
      showToast(mapError(error, 'template'), 'error');
    }
  };

  const handleToggleActive = async (template: MessageTemplate) => {
    try {
      await apiService.update(template.id, { is_active: !template.is_active });
      showToast(template.is_active ? 'Template désactivé' : 'Template activé', 'success');
      fetchTemplates();
    } catch (error) {
      showToast(mapError(error), 'error');
    }
  };

  const handleDuplicate = (template: MessageTemplate) => {
    setEditingTemplate(null);
    setFormData({
      ...template,
      name: `${template.name} (copie)`,
      is_system: false,
    });
    setIsModalOpen(true);
  };

  const insertVariable = (variable: string) => {
    if (contentRef.current) {
      const start = contentRef.current.selectionStart;
      const end = contentRef.current.selectionEnd;
      const text = formData.content || '';
      const newContent = text.substring(0, start) + variable + text.substring(end);
      setFormData({ ...formData, content: newContent });

      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.focus();
          contentRef.current.setSelectionRange(start + variable.length, start + variable.length);
        }
      }, 0);
    }
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'PAYMENT',
      channel: 'EMAIL',
      trigger: 'MANUAL',
      subject: '',
      content: '',
      variables: [],
      is_active: true,
      is_system: false,
    });
    setActiveVariableCategory(null);
  };

  const openEditModal = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({ ...template });
    setIsModalOpen(true);
  };

  const openPreview = (template: MessageTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const getChannelConfig = (channel: MessageChannel) => {
    return MESSAGE_CHANNELS.find((c) => c.id === channel);
  };

  const getCategoryConfig = (category: MessageCategory) => {
    return MESSAGE_CATEGORIES.find((c) => c.id === category);
  };

  // Compteur de caractères pour SMS
  const charCount = formData.content?.length || 0;
  const smsCount = Math.ceil(charCount / 160);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Modèles de messages</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Gérez vos templates de communication (Email, SMS, WhatsApp, Telegram)
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {MESSAGE_CATEGORIES.map((cat) => {
          const Icon = getCategoryIcon(cat.id);
          const count = templates.filter((t) => t.category === cat.id).length;
          const activeCount = templates.filter((t) => t.category === cat.id && t.is_active).length;

          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(filterCategory === cat.id ? 'ALL' : cat.id)}
              className={`p-3 rounded-lg border transition-all ${
                filterCategory === cat.id
                  ? `border-${cat.color}-400 bg-${cat.color}-50 dark:bg-${cat.color}-900/30`
                  : 'border-[var(--border)] hover:border-[var(--border)]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 text-${cat.color}-500`} />
              <p className="text-xs font-medium text-[var(--text-primary)]">{cat.label}</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">{count}</p>
              <p className="text-xs text-[var(--text-secondary)]">{activeCount} actifs</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value as MessageChannel | 'ALL')}
            className="px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
          >
            <option value="ALL">Tous les canaux</option>
            {MESSAGE_CHANNELS.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates List by Category */}
      <div className="space-y-6">
        {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
          if (categoryTemplates.length === 0) return null;

          const catConfig = getCategoryConfig(category as MessageCategory);
          const CatIcon = getCategoryIcon(category as MessageCategory);

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <CatIcon className={`w-5 h-5 text-${catConfig?.color}-500`} />
                <h3 className="font-semibold text-[var(--text-primary)]">{catConfig?.label}</h3>
                <span className="text-xs text-[var(--text-secondary)]">({categoryTemplates.length})</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {categoryTemplates.map((template) => {
                  const channelConfig = getChannelConfig(template.channel);
                  const ChannelIcon = getChannelIcon(template.channel);

                  return (
                    <Card
                      key={template.id}
                      className={`p-4 hover:shadow-md transition-all ${!template.is_active ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                              bg-${channelConfig?.color}-100 text-${channelConfig?.color}-700
                              dark:bg-${channelConfig?.color}-900/30 dark:text-${channelConfig?.color}-400`}
                            >
                              <ChannelIcon className="w-3 h-3" />
                              {channelConfig?.label}
                            </span>
                            {template.trigger !== 'MANUAL' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                <Zap className="w-3 h-3" />
                                Auto
                              </span>
                            )}
                            {template.delay_days && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]">
                                <Clock className="w-3 h-3" />J{template.delay_days > 0 ? '+' : ''}
                                {template.delay_days}
                              </span>
                            )}
                          </div>

                          <h4 className="font-medium text-[var(--text-primary)] truncate">
                            {template.name}
                            {template.is_system && (
                              <span className="ml-2 text-xs text-[var(--text-muted)]">(système)</span>
                            )}
                          </h4>

                          {template.subject && (
                            <p className="text-sm text-[var(--text-secondary)] truncate mt-1">
                              Objet: {template.subject}
                            </p>
                          )}

                          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                            {template.content.substring(0, 100)}...
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleToggleActive(template)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              template.is_active
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
                            }`}
                            title={template.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {template.is_active ? (
                              <ToggleRight className="w-5 h-5" />
                            ) : (
                              <ToggleLeft className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => openPreview(template)}
                            className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg"
                            title="Prévisualiser"
                          >
                            <Eye className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg"
                            title="Dupliquer"
                          >
                            <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                          <button
                            onClick={() => openEditModal(template)}
                            className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4 text-[var(--text-secondary)]" />
                          </button>
                          {!template.is_system && (
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="p-1.5 hover:bg-[var(--clr-danger-dim)] rounded-lg"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <Card className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Aucun template trouvé</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {searchQuery || filterCategory !== 'ALL' || filterChannel !== 'ALL'
                ? 'Modifiez vos filtres ou créez un nouveau template'
                : 'Commencez par créer votre premier template de message'}
            </p>
          </Card>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Modifier le template' : 'Nouveau template'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nom du template</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
              placeholder="Ex: Relance paiement J+7"
              required
            />
          </div>

          {/* Catégorie + Canal + Trigger */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as MessageCategory })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
              >
                {MESSAGE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Canal</label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value as MessageChannel })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
              >
                {MESSAGE_CHANNELS.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Déclencheur</label>
              <select
                value={formData.trigger}
                onChange={(e) => setFormData({ ...formData, trigger: e.target.value as MessageTrigger })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
              >
                <option value="MANUAL">Manuel</option>
                <option value="SCHEDULED">Planifié</option>
                <option value="AUTO_PAYMENT_DUE">Auto - Échéance paiement</option>
                <option value="AUTO_LEAD_FOLLOWUP">Auto - Suivi lead</option>
                <option value="AUTO_QUOTE_FOLLOWUP">Auto - Suivi devis</option>
                <option value="AUTO_ALERT">Auto - Alerte GPS</option>
                <option value="AUTO_INTERVENTION">Auto - Intervention</option>
              </select>
            </div>
          </div>

          {/* Délai (pour les triggers automatiques) */}
          {formData.trigger !== 'MANUAL' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Délai (jours) - négatif = avant, positif = après
              </label>
              <input
                type="number"
                value={formData.delay_days || 0}
                onChange={(e) => setFormData({ ...formData, delay_days: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
                placeholder="Ex: 7 pour J+7"
              />
            </div>
          )}

          {/* Sujet (pour Email) */}
          {formData.channel === 'EMAIL' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Objet de l'email</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
                placeholder="Ex: Rappel : Facture {{invoice.number}} à régler"
              />
            </div>
          )}

          {/* Variables disponibles */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Variables disponibles <span className="text-[var(--text-muted)]">(cliquez pour insérer)</span>
            </label>
            <div className="border rounded-lg border-[var(--border)] max-h-40 overflow-y-auto">
              {Object.entries(availableVariables).map(([category, vars], idx) => (
                <div key={category} className={idx > 0 ? 'border-t border-[var(--border)]' : ''}>
                  <button
                    type="button"
                    onClick={() => setActiveVariableCategory(activeVariableCategory === category ? null : category)}
                    className="w-full px-3 py-2 flex items-center justify-between bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-sm"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{category}</span>
                    {activeVariableCategory === category ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </button>
                  {activeVariableCategory === category && (
                    <div className="p-2 flex flex-wrap gap-1">
                      {vars.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertVariable(v.key)}
                          className="px-2 py-1 text-xs bg-[var(--primary-dim)] text-[var(--primary)] rounded hover:bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)] dark:hover:bg-[var(--primary-dim)]/50 font-mono"
                          title={v.example}
                        >
                          {v.key}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contenu */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-[var(--text-primary)]">Contenu du message</label>
              {formData.channel === 'SMS' && (
                <span className={`text-xs ${charCount > 160 ? 'text-orange-500' : 'text-[var(--text-secondary)]'}`}>
                  {charCount} caractères ({smsCount} SMS)
                </span>
              )}
            </div>
            <textarea
              ref={contentRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full h-48 px-3 py-2 border rounded-lg font-mono text-sm bg-[var(--bg-elevated)] border-[var(--border)]"
              placeholder="Saisissez votre message ici..."
              required
            />
          </div>

          {/* Actif */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-[var(--border)] text-[var(--primary)] mr-2"
            />
            <label className="text-sm text-[var(--text-primary)]">Template actif</label>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setPreviewTemplate({ ...formData, id: 'preview' } as MessageTemplate);
                setIsPreviewModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
            >
              <Eye className="w-4 h-4" />
              Prévisualiser
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingTemplate ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Prévisualisation du message"
      >
        <div className="space-y-4">
          {previewTemplate && (
            <>
              {/* Channel indicator */}
              <div className="flex items-center gap-2">
                {React.createElement(getChannelIcon(previewTemplate.channel), {
                  className: 'w-5 h-5 text-[var(--text-secondary)]',
                })}
                <span className="font-medium">{getChannelConfig(previewTemplate.channel)?.label}</span>
              </div>

              {/* Email preview */}
              {previewTemplate.channel === 'EMAIL' && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-[var(--bg-elevated)] px-4 py-2 border-b">
                    <p className="text-sm">
                      <span className="text-[var(--text-secondary)]">Objet:</span> {previewContent.subject}
                    </p>
                  </div>
                  <div className="p-4 bg-[var(--bg-surface)] whitespace-pre-wrap text-sm">{previewContent.content}</div>
                </div>
              )}

              {/* SMS/WhatsApp/Telegram preview */}
              {previewTemplate.channel !== 'EMAIL' && (
                <div
                  className={`p-4 rounded-lg ${
                    previewTemplate.channel === 'SMS'
                      ? 'bg-[var(--clr-success-dim)]'
                      : previewTemplate.channel === 'WHATSAPP'
                        ? 'bg-[var(--clr-emerald-dim)]'
                        : 'bg-sky-50 dark:bg-sky-900/20'
                  }`}
                >
                  <div className="max-w-xs mx-auto">
                    <div
                      className={`p-3 rounded-lg shadow-sm ${
                        previewTemplate.channel === 'SMS'
                          ? 'bg-white'
                          : previewTemplate.channel === 'WHATSAPP'
                            ? 'bg-white'
                            : 'bg-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{previewContent.content}</p>
                      <p className="text-xs text-[var(--text-muted)] text-right mt-2">
                        {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-[var(--text-secondary)] text-center">
                Les variables sont remplacées par des exemples
              </p>
            </>
          )}

          <div className="flex justify-end pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};

export default MessageTemplatesPanel;
