import React, { useState, useEffect } from 'react';
import type { AutomationRule, AutomationTriggerType, AutomationActionType } from '../../../types';
import { Modal } from '../../../components/Modal';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import { api } from '../../../services/apiLazy';
import {
  Zap,
  Plus,
  Trash2,
  PlayCircle,
  PauseCircle,
  Pencil,
  Copy,
  Bell,
  Mail,
  MessageSquare,
  Send,
  Activity,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  LayoutTemplate,
} from 'lucide-react';

// ─── TRIGGER CONFIG ────────────────────────────────────────────────────────
const TRIGGER_CONFIG: Record<AutomationTriggerType, { label: string; color: string; group: string }> = {
  LEAD_CREATED: { label: 'Nouveau lead créé', color: 'green', group: 'CRM' },
  LEAD_STATUS_CHANGED: { label: 'Statut lead modifié', color: 'green', group: 'CRM' },
  QUOTE_SENT: { label: 'Devis envoyé', color: 'blue', group: 'Devis' },
  QUOTE_ACCEPTED: { label: 'Devis accepté', color: 'blue', group: 'Devis' },
  QUOTE_REJECTED: { label: 'Devis refusé', color: 'blue', group: 'Devis' },
  INVOICE_CREATED: { label: 'Facture créée', color: 'purple', group: 'Facturation' },
  INVOICE_OVERDUE: { label: 'Facture en retard', color: 'red', group: 'Facturation' },
  INVOICE_PAID: { label: 'Facture payée', color: 'purple', group: 'Facturation' },
  CONTRACT_CREATED: { label: 'Contrat créé', color: 'indigo', group: 'Contrats' },
  CONTRACT_EXPIRING: { label: 'Contrat expire bientôt', color: 'amber', group: 'Contrats' },
  CONTRACT_EXPIRED: { label: 'Contrat expiré', color: 'red', group: 'Contrats' },
  PAYMENT_RECEIVED: { label: 'Paiement reçu', color: 'emerald', group: 'Paiements' },
  TASK_DUE: { label: 'Tâche échue', color: 'orange', group: 'Tâches' },
  VEHICLE_ALERT: { label: 'Alerte véhicule', color: 'red', group: 'GPS' },
};

const ACTION_CONFIG: Record<AutomationActionType, { label: string; icon: React.ElementType; color: string }> = {
  CREATE_TASK: { label: 'Créer une tâche', icon: CheckCircle, color: 'blue' },
  SEND_EMAIL: { label: 'Envoyer un email', icon: Mail, color: 'sky' },
  SEND_SMS: { label: 'Envoyer un SMS', icon: MessageSquare, color: 'green' },
  SEND_TELEGRAM: { label: 'Envoyer Telegram', icon: Send, color: 'cyan' },
  UPDATE_STATUS: { label: 'Modifier le statut', icon: Activity, color: 'purple' },
  ASSIGN_TO_USER: { label: 'Assigner à', icon: Bell, color: 'indigo' },
  CREATE_DUNNING: { label: 'Créer relance', icon: CreditCard, color: 'red' },
  WEBHOOK: { label: 'Appeler webhook', icon: Zap, color: 'amber' },
};

// ─── TYPES ─────────────────────────────────────────────────────────────────
interface MessageTemplate {
  id: string;
  name: string;
  channel: string;
  category: string;
  content: string;
  subject?: string;
  is_active: boolean;
}

type FormData = {
  name: string;
  triggerType: AutomationTriggerType;
  condition: {
    field?: string;
    operator?: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
    value?: string;
  } | null;
  action: AutomationRule['action'];
};

const EMPTY_FORM: FormData = {
  name: '',
  triggerType: 'LEAD_CREATED',
  condition: null,
  action: {
    type: 'CREATE_TASK',
    taskTemplate: { title: '', description: '', priority: 'MEDIUM', dueInDays: 1 },
  },
};

// ─── COMPONENT ─────────────────────────────────────────────────────────────
export const AutomationRulesView: React.FC = () => {
  const { automationRules, addAutomationRule, updateAutomationRule, toggleAutomationRule, deleteAutomationRule } =
    useDataContext();
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [showCondition, setShowCondition] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [filterTrigger, setFilterTrigger] = useState<string>('ALL');

  // Load message templates from Administration
  useEffect(() => {
    api.messageTemplates
      .list()
      .then((data: MessageTemplate[]) => {
        setMessageTemplates(data.filter((t) => t.is_active));
      })
      .catch(() => {
        /* Templates optionnelles — non bloquant */
      });
  }, []);

  const openCreate = () => {
    setEditingRule(null);
    setForm({ ...EMPTY_FORM });
    setShowCondition(false);
    setIsModalOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      triggerType: rule.triggerType,
      condition: rule.condition || null,
      action: { ...rule.action },
    });
    setShowCondition(!!rule.condition?.field);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('nom de la règle'), 'error');
      return;
    }

    if (form.action.type === 'CREATE_TASK' && !form.action.taskTemplate?.title.trim()) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('titre de la tâche'), 'error');
      return;
    }
    if (form.action.type === 'SEND_EMAIL' && !form.action.emailTemplate?.subject.trim()) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD("sujet de l'email"), 'error');
      return;
    }
    if (form.action.type === 'SEND_SMS' && !form.action.smsTemplate?.message.trim()) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('message SMS'), 'error');
      return;
    }
    if (form.action.type === 'WEBHOOK' && !form.action.webhookUrl?.trim()) {
      showToast(TOAST.VALIDATION.REQUIRED_FIELD('URL du webhook'), 'error');
      return;
    }

    const payload: Partial<AutomationRule> = {
      name: form.name,
      triggerType: form.triggerType,
      condition: showCondition && form.condition?.field ? form.condition : null,
      action: form.action,
    };

    if (editingRule) {
      updateAutomationRule(editingRule.id, payload);
      showToast(TOAST.CRM.AUTOMATION_UPDATED, 'success');
    } else {
      addAutomationRule(payload);
      showToast(TOAST.CRM.AUTOMATION_CREATED, 'success');
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (rule: AutomationRule) => {
    const confirmed = await confirm(`Supprimer la règle "${rule.name}" ?`);
    if (confirmed) {
      deleteAutomationRule(rule.id);
      showToast(TOAST.CRM.AUTOMATION_DELETED, 'success');
    }
  };

  const handleDuplicate = (rule: AutomationRule) => {
    addAutomationRule({
      name: `${rule.name} (copie)`,
      triggerType: rule.triggerType,
      condition: rule.condition,
      action: rule.action,
    });
    showToast(TOAST.CRM.AUTOMATION_DUPLICATED, 'success');
  };

  const setActionType = (type: AutomationActionType) => {
    const base: AutomationRule['action'] = { type };
    switch (type) {
      case 'CREATE_TASK':
        base.taskTemplate = { title: '', description: '', priority: 'MEDIUM', dueInDays: 1 };
        break;
      case 'SEND_EMAIL':
        base.emailTemplate = { subject: '', html: '' };
        break;
      case 'SEND_SMS':
      case 'SEND_TELEGRAM':
        base.smsTemplate = { message: '' };
        break;
      case 'UPDATE_STATUS':
        base.statusUpdate = { newStatus: '' };
        break;
      case 'WEBHOOK':
        base.webhookUrl = '';
        break;
    }
    setForm((prev) => ({ ...prev, action: base }));
  };

  const applyMessageTemplate = (templateId: string) => {
    const tpl = messageTemplates.find((t) => t.id === templateId);
    if (!tpl) return;

    setForm((prev) => {
      const action = { ...prev.action, messageTemplateId: templateId };
      if (prev.action.type === 'SEND_EMAIL') {
        action.emailTemplate = { subject: tpl.subject || tpl.name, html: tpl.content };
      } else if (prev.action.type === 'SEND_SMS' || prev.action.type === 'SEND_TELEGRAM') {
        action.smsTemplate = { message: tpl.content };
      }
      return { ...prev, action };
    });
  };

  // Filter rules
  const filteredRules =
    filterTrigger === 'ALL' ? automationRules : automationRules.filter((r) => r.triggerType === filterTrigger);

  const triggerGroups = Object.entries(TRIGGER_CONFIG).reduce<
    Record<string, { key: AutomationTriggerType; label: string }[]>
  >((acc, [k, v]) => {
    if (!acc[v.group]) acc[v.group] = [];
    acc[v.group].push({ key: k as AutomationTriggerType, label: v.label });
    return acc;
  }, {});

  // Relevant message templates for current action channel
  const relevantTemplates = messageTemplates.filter((t) => {
    if (form.action.type === 'SEND_EMAIL') return t.channel === 'EMAIL';
    if (form.action.type === 'SEND_SMS') return t.channel === 'SMS';
    if (form.action.type === 'SEND_TELEGRAM') return t.channel === 'TELEGRAM';
    return false;
  });

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <Zap className="w-8 h-8 text-amber-500" />
            Automatisations
          </h2>
          <p className="text-[var(--text-secondary)]">
            {automationRules.length} règle{automationRules.length !== 1 ? 's' : ''} •{' '}
            {automationRules.filter((r) => r.isActive).length} active
            {automationRules.filter((r) => r.isActive).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterTrigger}
            onChange={(e) => setFilterTrigger(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)]"
          >
            <option value="ALL">Tous les déclencheurs</option>
            {Object.entries(triggerGroups).map(([group, items]) => (
              <optgroup key={group} label={group}>
                {items.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold hover:bg-[var(--primary-light)] flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Nouvelle Règle
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filteredRules.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Zap className="w-16 h-16 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto" />
            <p className="text-[var(--text-secondary)] text-lg">Aucune règle d'automatisation</p>
            <button onClick={openCreate} className="text-[var(--primary)] hover:text-[var(--primary)] font-medium">
              Créer votre première règle →
            </button>
          </div>
        </div>
      )}

      {/* Rules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredRules.map((rule) => {
          const trigger = TRIGGER_CONFIG[rule.triggerType];
          const action = ACTION_CONFIG[rule.action?.type];
          const ActionIcon = action?.icon || Zap;

          return (
            <div
              key={rule.id}
              className={`bg-[var(--bg-elevated)] rounded-xl p-5 border-l-4 shadow-sm transition-all hover:shadow-md ${
                rule.isActive ? 'border-l-green-500' : 'border-l-slate-300 dark:border-l-slate-600 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-[var(--text-primary)] text-lg leading-tight pr-2">{rule.name}</h3>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(rule)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] rounded hover:bg-[var(--bg-elevated)]"
                    title="Modifier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(rule)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-purple-500 rounded hover:bg-[var(--bg-elevated)]"
                    title="Dupliquer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleAutomationRule(rule.id)}
                    className={`p-1.5 rounded hover:bg-[var(--bg-elevated)] ${rule.isActive ? 'text-green-500' : 'text-[var(--text-muted)]'}`}
                    title={rule.isActive ? 'Désactiver' : 'Activer'}
                  >
                    {rule.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(rule)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-red-500 rounded hover:bg-[var(--bg-elevated)]"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Trigger / Condition / Action */}
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    QUAND
                  </span>
                  <span className="text-[var(--text-secondary)]">{trigger?.label || rule.triggerType}</span>
                </div>

                {rule.condition?.field && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      <Filter className="w-3 h-3" />
                      SI
                    </span>
                    <span className="text-[var(--text-secondary)] text-xs">
                      {rule.condition.field} {rule.condition.operator?.toLowerCase()}{' '}
                      {String(rule.condition.value || '')}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]">
                    <ActionIcon className="w-3 h-3" />
                    ALORS
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {action?.label || rule.action?.type}
                    {rule.action?.type === 'CREATE_TASK' && rule.action.taskTemplate?.title && (
                      <> : "{rule.action.taskTemplate.title}"</>
                    )}
                    {rule.action?.type === 'SEND_EMAIL' && rule.action.emailTemplate?.subject && (
                      <> : "{rule.action.emailTemplate.subject}"</>
                    )}
                    {rule.action?.messageTemplateId && (
                      <span className="ml-1 text-xs text-purple-500">
                        <LayoutTemplate className="w-3 h-3 inline" /> modèle
                      </span>
                    )}
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border)]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {rule.action?.type === 'CREATE_TASK'
                      ? rule.action.taskTemplate?.dueInDays === 0
                        ? 'Immédiat'
                        : `J+${rule.action.taskTemplate?.dueInDays || 0}`
                      : rule.action?.type === 'WEBHOOK'
                        ? 'Temps réel'
                        : 'Auto'}
                  </span>
                  {(rule.runCount ?? 0) > 0 && (
                    <span>
                      {rule.runCount} exécution{(rule.runCount ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── MODAL CREATE/EDIT ────────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? 'Modifier la Règle' : "Nouvelle Règle d'Automatisation"}
      >
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nom de la règle *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Relance Devis J+3"
            />
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
              Déclencheur *
            </label>
            <select
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
              value={form.triggerType}
              onChange={(e) => setForm((prev) => ({ ...prev, triggerType: e.target.value as AutomationTriggerType }))}
            >
              {Object.entries(triggerGroups).map(([group, items]) => (
                <optgroup key={group} label={group}>
                  {items.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Condition (optional) */}
          <div className="border rounded-lg border-[var(--border)] p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1">
                <Filter className="w-4 h-4 text-amber-500" />
                Condition (optionnel)
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowCondition(!showCondition);
                  if (showCondition) setForm((prev) => ({ ...prev, condition: null }));
                }}
                className="text-xs text-[var(--primary)] hover:text-[var(--primary)]"
              >
                {showCondition ? 'Retirer' : 'Ajouter une condition'}
              </button>
            </div>
            {showCondition && (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Champ (ex: status)"
                  className="px-2 py-1.5 border rounded text-sm bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                  value={form.condition?.field || ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, condition: { ...prev.condition, field: e.target.value } }))
                  }
                />
                <select
                  className="px-2 py-1.5 border rounded text-sm bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                  value={form.condition?.operator || 'EQUALS'}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      condition: {
                        ...prev.condition,
                        operator: e.target.value as 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN',
                      },
                    }))
                  }
                >
                  <option value="EQUALS">Égal à</option>
                  <option value="NOT_EQUALS">Différent de</option>
                  <option value="CONTAINS">Contient</option>
                  <option value="GREATER_THAN">Supérieur à</option>
                  <option value="LESS_THAN">Inférieur à</option>
                </select>
                <input
                  type="text"
                  placeholder="Valeur"
                  className="px-2 py-1.5 border rounded text-sm bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                  value={form.condition?.value || ''}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, condition: { ...prev.condition, value: e.target.value } }))
                  }
                />
              </div>
            )}
          </div>

          {/* Action Type selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              <Zap className="w-4 h-4 inline mr-1 text-[var(--primary)]" />
              Action *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {(
                Object.entries(ACTION_CONFIG) as [AutomationActionType, (typeof ACTION_CONFIG)[AutomationActionType]][]
              ).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const isSelected = form.action.type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActionType(key)}
                    className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)] dark:border-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)] dark:text-[var(--text-muted)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-center leading-tight">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Details */}
          <div className="border-t pt-4 border-[var(--border)] space-y-3">
            {/* ── CREATE_TASK ────────────────────── */}
            {form.action.type === 'CREATE_TASK' && (
              <>
                <h4 className="font-bold text-[var(--text-primary)] text-sm">Configuration de la tâche</h4>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Titre *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                    value={form.action.taskTemplate?.title || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        action: {
                          ...prev.action,
                          taskTemplate: { ...prev.action.taskTemplate!, title: e.target.value },
                        },
                      }))
                    }
                    placeholder="Ex: Relancer le client"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Délai (jours)</label>
                    <input
                      type="number"
                      min="0"
                      max="365"
                      className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                      value={form.action.taskTemplate?.dueInDays ?? 1}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          action: {
                            ...prev.action,
                            taskTemplate: { ...prev.action.taskTemplate!, dueInDays: parseInt(e.target.value) || 0 },
                          },
                        }))
                      }
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">0 = le jour même</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Priorité</label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                      value={form.action.taskTemplate?.priority || 'MEDIUM'}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          action: {
                            ...prev.action,
                            taskTemplate: { ...prev.action.taskTemplate!, priority: e.target.value as any },
                          },
                        }))
                      }
                    >
                      <option value="LOW">Basse</option>
                      <option value="MEDIUM">Moyenne</option>
                      <option value="HIGH">Haute</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                    rows={2}
                    value={form.action.taskTemplate?.description || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        action: {
                          ...prev.action,
                          taskTemplate: { ...prev.action.taskTemplate!, description: e.target.value },
                        },
                      }))
                    }
                    placeholder="Description optionnelle..."
                  />
                </div>
              </>
            )}

            {/* ── SEND_EMAIL ────────────────────── */}
            {form.action.type === 'SEND_EMAIL' && (
              <>
                <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-500" /> Configuration email
                </h4>
                {relevantTemplates.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      <LayoutTemplate className="w-3.5 h-3.5 inline mr-1 text-purple-500" />
                      Modèle de message (Administration)
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)] border-purple-200 dark:border-purple-800"
                      value={form.action.messageTemplateId || ''}
                      onChange={(e) => {
                        if (e.target.value) applyMessageTemplate(e.target.value);
                        else setForm((prev) => ({ ...prev, action: { ...prev.action, messageTemplateId: undefined } }));
                      }}
                    >
                      <option value="">— Saisie libre —</option>
                      {relevantTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          📧 {t.name} ({t.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Sujet *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                    value={form.action.emailTemplate?.subject || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        action: {
                          ...prev.action,
                          emailTemplate: { ...prev.action.emailTemplate!, subject: e.target.value },
                        },
                      }))
                    }
                    placeholder="Sujet de l'email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Contenu HTML</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)] font-mono text-xs"
                    rows={4}
                    value={form.action.emailTemplate?.html || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        action: {
                          ...prev.action,
                          emailTemplate: { ...prev.action.emailTemplate!, html: e.target.value },
                        },
                      }))
                    }
                    placeholder="<p>Bonjour {{client.name}},</p>"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Variables : {'{{client.name}}'}, {'{{invoice.number}}'}, etc.
                  </p>
                </div>
              </>
            )}

            {/* ── SEND_SMS / SEND_TELEGRAM ────────── */}
            {(form.action.type === 'SEND_SMS' || form.action.type === 'SEND_TELEGRAM') && (
              <>
                <h4 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
                  {form.action.type === 'SEND_SMS' ? (
                    <>
                      <MessageSquare className="w-4 h-4 text-green-500" /> Configuration SMS
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-cyan-500" /> Configuration Telegram
                    </>
                  )}
                </h4>
                {relevantTemplates.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      <LayoutTemplate className="w-3.5 h-3.5 inline mr-1 text-purple-500" />
                      Modèle de message (Administration)
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)] border-purple-200 dark:border-purple-800"
                      value={form.action.messageTemplateId || ''}
                      onChange={(e) => {
                        if (e.target.value) applyMessageTemplate(e.target.value);
                        else setForm((prev) => ({ ...prev, action: { ...prev.action, messageTemplateId: undefined } }));
                      }}
                    >
                      <option value="">— Saisie libre —</option>
                      {relevantTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.channel === 'SMS' ? '💬' : '✈️'} {t.name} ({t.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Message *</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                    rows={3}
                    value={form.action.smsTemplate?.message || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        action: { ...prev.action, smsTemplate: { message: e.target.value } },
                      }))
                    }
                    placeholder={
                      form.action.type === 'SEND_SMS' ? 'Bonjour {{client.name}}, ...' : 'Message Telegram...'
                    }
                  />
                  {form.action.type === 'SEND_SMS' && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {(form.action.smsTemplate?.message || '').length}/160 caractères
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ── UPDATE_STATUS ──────────────────── */}
            {form.action.type === 'UPDATE_STATUS' && (
              <>
                <h4 className="font-bold text-[var(--text-primary)] text-sm">Changement de statut</h4>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Nouveau statut *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)]"
                    value={form.action.statusUpdate?.newStatus || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        action: { ...prev.action, statusUpdate: { newStatus: e.target.value } },
                      }))
                    }
                    placeholder="Ex: QUALIFIED, WON, OVERDUE..."
                  />
                </div>
              </>
            )}

            {/* ── WEBHOOK ────────────────────────── */}
            {form.action.type === 'WEBHOOK' && (
              <>
                <h4 className="font-bold text-[var(--text-primary)] text-sm">Webhook</h4>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">URL *</label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-primary)] font-mono text-sm"
                    value={form.action.webhookUrl || ''}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        action: { ...prev.action, webhookUrl: e.target.value },
                      }))
                    }
                    placeholder="https://api.example.com/webhook"
                  />
                </div>
              </>
            )}

            {/* ── CREATE_DUNNING / ASSIGN_TO_USER ── */}
            {(form.action.type === 'CREATE_DUNNING' || form.action.type === 'ASSIGN_TO_USER') && (
              <div className="bg-[var(--bg-elevated)]/50 rounded-lg p-3 text-sm text-[var(--text-secondary)]">
                <p>
                  {form.action.type === 'CREATE_DUNNING'
                    ? 'Une action de relance sera automatiquement créée pour la facture concernée.'
                    : "L'entité sera assignée à l'utilisateur spécifié dans les conditions."}
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] font-medium"
            >
              {editingRule ? 'Mettre à jour' : 'Créer la Règle'}
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDialogComponent />
    </div>
  );
};
