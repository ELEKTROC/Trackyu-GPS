/**
 * DocumentTemplatesPanel V2 - Panneau de gestion des modèles de documents amélioré
 *
 * Fonctionnalités:
 * - CRUD templates
 * - Prévisualisation live avec variables substituées
 * - Variables cliquables pour insertion
 * - Duplication de template
 * - Nouveaux types de documents
 * - Export PDF preview
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  Code,
  Eye,
  Copy,
  Download,
  Check,
  X,
  Loader2,
  FileType,
  Receipt,
  FileSignature,
  ClipboardList,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Palette,
  Bold,
  Italic,
  List,
  AlignLeft,
  Image,
  Link,
  Undo,
  Redo,
  RefreshCw,
  Save,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { api } from '../../../services/apiLazy';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import type { DocumentTemplate } from '../../../types';

// Types de documents disponibles
const DOCUMENT_TYPES = [
  { id: 'INVOICE', label: 'Facture', icon: Receipt, color: 'blue' },
  { id: 'QUOTE', label: 'Devis', icon: FileText, color: 'green' },
  { id: 'CONTRACT', label: 'Contrat', icon: FileSignature, color: 'purple' },
  { id: 'RECEIPT', label: 'Reçu', icon: FileCheck, color: 'orange' },
  { id: 'INTERVENTION_REPORT', label: "Rapport d'intervention", icon: ClipboardList, color: 'teal' },
  { id: 'DELIVERY_NOTE', label: 'Bon de livraison', icon: FileType, color: 'indigo' },
];

// Variables disponibles par type de document
const VARIABLES_BY_TYPE: Record<
  string,
  { category: string; variables: { key: string; label: string; example: string }[] }[]
> = {
  INVOICE: [
    {
      category: 'Client',
      variables: [
        { key: '{{client.name}}', label: 'Nom du client', example: 'Entreprise ABC' },
        { key: '{{client.address}}', label: 'Adresse', example: '123 Rue Principale, Abidjan' },
        { key: '{{client.phone}}', label: 'Téléphone', example: '+225 07 00 00 00' },
        { key: '{{client.email}}', label: 'Email', example: 'contact@abc.ci' },
      ],
    },
    {
      category: 'Facture',
      variables: [
        { key: '{{invoice.number}}', label: 'Numéro', example: 'FAC-2025-0001' },
        { key: '{{invoice.date}}', label: 'Date', example: '20/12/2025' },
        { key: '{{invoice.due_date}}', label: "Date d'échéance", example: '20/01/2026' },
        { key: '{{invoice.total}}', label: 'Total TTC', example: '150 000 FCFA' },
        { key: '{{invoice.subtotal}}', label: 'Sous-total HT', example: '127 119 FCFA' },
        { key: '{{invoice.tax}}', label: 'TVA (0%)', example: '0 FCFA' },
      ],
    },
    {
      category: 'Entreprise',
      variables: [
        { key: '{{company.name}}', label: 'Nom société', example: 'TrackYu GPS' },
        { key: '{{company.address}}', label: 'Adresse', example: 'Cocody, Abidjan' },
        { key: '{{company.phone}}', label: 'Téléphone', example: '+225 07 XX XX XX' },
        { key: '{{company.logo}}', label: 'Logo (URL)', example: 'https://...' },
      ],
    },
  ],
  QUOTE: [
    {
      category: 'Client',
      variables: [
        { key: '{{client.name}}', label: 'Nom du client', example: 'Entreprise XYZ' },
        { key: '{{client.address}}', label: 'Adresse', example: '456 Avenue Commerce' },
        { key: '{{client.contact}}', label: 'Contact', example: 'M. Koné' },
      ],
    },
    {
      category: 'Devis',
      variables: [
        { key: '{{quote.number}}', label: 'Numéro', example: 'DEV-2025-0042' },
        { key: '{{quote.date}}', label: 'Date', example: '20/12/2025' },
        { key: '{{quote.validity}}', label: 'Validité', example: '30 jours' },
        { key: '{{quote.total}}', label: 'Total TTC', example: '250 000 FCFA' },
      ],
    },
  ],
  INTERVENTION_REPORT: [
    {
      category: 'Intervention',
      variables: [
        { key: '{{intervention.id}}', label: 'Référence', example: 'INT-2025-0123' },
        { key: '{{intervention.date}}', label: 'Date', example: '20/12/2025' },
        { key: '{{intervention.type}}', label: 'Type', example: 'Installation GPS' },
        { key: '{{intervention.status}}', label: 'Statut', example: 'Terminée' },
        { key: '{{intervention.duration}}', label: 'Durée', example: '2h30' },
        { key: '{{intervention.notes}}', label: 'Notes', example: 'Installation réussie' },
      ],
    },
    {
      category: 'Véhicule',
      variables: [
        { key: '{{vehicle.immat}}', label: 'Immatriculation', example: 'AB-123-CD' },
        { key: '{{vehicle.brand}}', label: 'Marque', example: 'Toyota' },
        { key: '{{vehicle.model}}', label: 'Modèle', example: 'Hilux' },
      ],
    },
    {
      category: 'Technicien',
      variables: [
        { key: '{{technician.name}}', label: 'Nom', example: 'Jean Dupont' },
        { key: '{{technician.phone}}', label: 'Téléphone', example: '+225 07 00 00 00' },
      ],
    },
  ],
  CONTRACT: [
    {
      category: 'Client',
      variables: [
        { key: '{{client.name}}', label: 'Nom du client', example: 'Société ABC' },
        { key: '{{client.representative}}', label: 'Représentant', example: 'M. Konan' },
        { key: '{{client.address}}', label: 'Adresse', example: 'Plateau, Abidjan' },
      ],
    },
    {
      category: 'Contrat',
      variables: [
        { key: '{{contract.number}}', label: 'Numéro', example: 'CTR-2025-001' },
        { key: '{{contract.start_date}}', label: 'Date de début', example: '01/01/2026' },
        { key: '{{contract.end_date}}', label: 'Date de fin', example: '31/12/2026' },
        { key: '{{contract.duration}}', label: 'Durée', example: '12 mois' },
        { key: '{{contract.monthly_amount}}', label: 'Tarif', example: '25 000' },
      ],
    },
  ],
  RECEIPT: [
    {
      category: 'Paiement',
      variables: [
        { key: '{{payment.amount}}', label: 'Montant', example: '150 000 FCFA' },
        { key: '{{payment.date}}', label: 'Date', example: '20/12/2025' },
        { key: '{{payment.method}}', label: 'Mode', example: 'Wave' },
        { key: '{{payment.reference}}', label: 'Référence', example: 'PAY-2025-0789' },
      ],
    },
  ],
  DELIVERY_NOTE: [
    {
      category: 'Livraison',
      variables: [
        { key: '{{delivery.number}}', label: 'Numéro BL', example: 'BL-2025-0456' },
        { key: '{{delivery.date}}', label: 'Date', example: '20/12/2025' },
        { key: '{{delivery.items}}', label: 'Articles', example: '2x GPS Tracker' },
      ],
    },
  ],
};

// Template HTML par défaut
const DEFAULT_TEMPLATES: Record<string, string> = {
  INVOICE: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company { font-size: 24px; font-weight: bold; color: #1e40af; }
    .invoice-title { font-size: 32px; color: #334155; margin-bottom: 20px; }
    .info-box { background: #f1f5f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .total { font-size: 24px; font-weight: bold; text-align: right; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">{{company.name}}</div>
    <div>{{invoice.date}}</div>
  </div>
  <h1 class="invoice-title">FACTURE {{invoice.number}}</h1>
  <div class="info-box">
    <strong>Client:</strong> {{client.name}}<br>
    <strong>Adresse:</strong> {{client.address}}<br>
    <strong>Téléphone:</strong> {{client.phone}}
  </div>
  <table style="width: 100%; border-collapse: collapse;">
    <thead>
      <tr style="background: #e2e8f0;">
        <th style="padding: 12px; text-align: left;">Description</th>
        <th style="padding: 12px; text-align: right;">Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Service GPS</td>
        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">{{invoice.subtotal}}</td>
      </tr>
    </tbody>
  </table>
  <div class="total">
    <div>Sous-total: {{invoice.subtotal}}</div>
    <div>TVA (0%): {{invoice.tax}}</div>
    <div style="color: #1e40af;">Total TTC: {{invoice.total}}</div>
  </div>
</body>
</html>`,
  INTERVENTION_REPORT: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { background: #1e40af; color: white; padding: 20px; margin: -40px -40px 40px -40px; }
    .title { font-size: 24px; font-weight: bold; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 18px; font-weight: bold; color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-bottom: 12px; }
    .field { margin-bottom: 8px; }
    .label { font-weight: bold; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">RAPPORT D'INTERVENTION</div>
    <div>{{intervention.id}} - {{intervention.date}}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Véhicule</div>
    <div class="field"><span class="label">Immatriculation:</span> {{vehicle.immat}}</div>
    <div class="field"><span class="label">Véhicule:</span> {{vehicle.brand}} {{vehicle.model}}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Intervention</div>
    <div class="field"><span class="label">Type:</span> {{intervention.type}}</div>
    <div class="field"><span class="label">Statut:</span> {{intervention.status}}</div>
    <div class="field"><span class="label">Durée:</span> {{intervention.duration}}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Technicien</div>
    <div class="field"><span class="label">Nom:</span> {{technician.name}}</div>
    <div class="field"><span class="label">Téléphone:</span> {{technician.phone}}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Notes</div>
    <p>{{intervention.notes}}</p>
  </div>
</body>
</html>`,
};

export const DocumentTemplatesPanelV2 = () => {
  // State
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeVariableCategory, setActiveVariableCategory] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<DocumentTemplate>>({
    name: '',
    type: 'INVOICE',
    content: '',
    variables: [],
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
      const data = await api.adminFeatures.templates.list();
      setTemplates(data);
    } catch (error) {
      showToast(TOAST.CRUD.ERROR_LOAD('modèles'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Variables disponibles pour le type actuel
  const availableVariables = useMemo(() => {
    return VARIABLES_BY_TYPE[formData.type || 'INVOICE'] || VARIABLES_BY_TYPE.INVOICE;
  }, [formData.type]);

  // Prévisualisation avec variables remplacées
  const previewContent = useMemo(() => {
    if (!previewTemplate?.content) return '';

    let content = previewTemplate.content;
    const variables = VARIABLES_BY_TYPE[previewTemplate.type] || [];

    // Remplacer chaque variable par son exemple
    variables.forEach((category) => {
      category.variables.forEach((v) => {
        content = content.replace(new RegExp(v.key.replace(/[{}]/g, '\\$&'), 'g'), v.example);
      });
    });

    return content;
  }, [previewTemplate]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Extraire les variables utilisées dans le contenu
      const usedVariables: string[] = [];
      const variableRegex = /\{\{([^}]+)\}\}/g;
      let match;
      while ((match = variableRegex.exec(formData.content || '')) !== null) {
        if (!usedVariables.includes(match[0])) {
          usedVariables.push(match[0]);
        }
      }

      const dataToSave = { ...formData, variables: usedVariables };

      if (editingTemplate) {
        await api.adminFeatures.templates.update(editingTemplate.id, dataToSave);
        showToast(TOAST.ADMIN.TEMPLATE_UPDATED, 'success');
      } else {
        await api.adminFeatures.templates.create(dataToSave);
        showToast(TOAST.ADMIN.TEMPLATE_CREATED, 'success');
      }
      setIsModalOpen(false);
      fetchTemplates();
      resetForm();
    } catch (error) {
      showToast(mapError(error, 'modèle'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !(await confirm({
        message: 'Êtes-vous sûr de vouloir supprimer ce modèle ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      }))
    )
      return;
    try {
      await api.adminFeatures.templates.delete(id);
      showToast(TOAST.ADMIN.TEMPLATE_DELETED, 'success');
      fetchTemplates();
    } catch (error) {
      showToast(mapError(error, 'modèle'), 'error');
    }
  };

  const handleDuplicate = (template: DocumentTemplate) => {
    setEditingTemplate(null);
    setFormData({
      name: `${template.name} (copie)`,
      type: template.type,
      content: template.content,
      variables: template.variables,
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

      // Repositionner le curseur après la variable
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
      type: 'INVOICE',
      content: '',
      variables: [],
      is_system: false,
    });
    setActiveVariableCategory(null);
  };

  const openEditModal = (template: DocumentTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
      variables: template.variables,
      is_system: template.is_system,
    });
    setIsModalOpen(true);
  };

  const openNewModal = (type?: string) => {
    resetForm();
    if (type) {
      setFormData((prev) => ({
        ...prev,
        type: type as DocumentTemplate['type'],
        content: DEFAULT_TEMPLATES[type] || '',
      }));
    }
    setIsModalOpen(true);
  };

  const openPreview = (template: DocumentTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewModalOpen(true);
  };

  const getTypeConfig = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.id === type) || DOCUMENT_TYPES[0];
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Modèles de documents</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Créez et personnalisez vos templates de factures, devis et rapports
          </p>
        </div>
        <button
          onClick={() => openNewModal()}
          className="flex items-center px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau modèle
        </button>
      </div>

      {/* Quick Create by Type */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {DOCUMENT_TYPES.map((type) => {
          const Icon = type.icon;
          const count = templates.filter((t) => t.type === type.id).length;

          return (
            <button
              key={type.id}
              onClick={() => openNewModal(type.id)}
              className={`p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all text-center group
                border-${type.color}-200 hover:border-${type.color}-400 hover:bg-${type.color}-50
                dark:border-${type.color}-800 dark:hover:border-${type.color}-600 dark:hover:bg-${type.color}-900/20`}
            >
              <Icon
                className={`w-8 h-8 mx-auto mb-2 text-${type.color}-500 group-hover:scale-110 transition-transform`}
              />
              <p className="text-sm font-medium text-[var(--text-primary)]">{type.label}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {count} modèle{count > 1 ? 's' : ''}
              </p>
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.length === 0 ? (
          <Card className="col-span-full p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Aucun modèle créé</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Commencez par créer votre premier template de document
            </p>
          </Card>
        ) : (
          templates.map((template) => {
            const typeConfig = getTypeConfig(template.type);
            const Icon = typeConfig.icon;

            return (
              <Card key={template.id} className="p-4 hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-lg bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30`}>
                    <Icon className={`w-5 h-5 text-${typeConfig.color}-600 dark:text-${typeConfig.color}-400`} />
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>

                <span
                  className={`inline-block px-2 py-0.5 text-xs rounded-full mb-2
                  bg-${typeConfig.color}-100 text-${typeConfig.color}-700
                  dark:bg-${typeConfig.color}-900/30 dark:text-${typeConfig.color}-400`}
                >
                  {typeConfig.label}
                </span>

                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  {template.name}
                  {template.is_system && <span className="ml-2 text-xs text-[var(--text-muted)]">(système)</span>}
                </h3>

                <div className="flex flex-wrap gap-1.5">
                  {template.variables?.slice(0, 4).map((variable, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-[var(--bg-elevated)] text-xs rounded text-[var(--text-secondary)] font-mono"
                    >
                      {variable}
                    </span>
                  ))}
                  {(template.variables?.length || 0) > 4 && (
                    <span className="px-2 py-0.5 bg-[var(--bg-elevated)] text-xs rounded text-[var(--text-secondary)]">
                      +{template.variables!.length - 4}
                    </span>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Nom du modèle</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Ex: Facture standard"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Type de document</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as DocumentTemplate['type'],
                    content: formData.content || DEFAULT_TEMPLATES[e.target.value] || '',
                  })
                }
                className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Variables Panel */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Variables disponibles <span className="text-[var(--text-muted)]">(cliquez pour insérer)</span>
            </label>
            <div className="border rounded-lg border-[var(--border)] overflow-hidden">
              {availableVariables.map((category, idx) => (
                <div key={category.category} className={idx > 0 ? 'border-t border-[var(--border)]' : ''}>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveVariableCategory(activeVariableCategory === category.category ? null : category.category)
                    }
                    className="w-full px-3 py-2 flex items-center justify-between bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                  >
                    <span className="text-sm font-medium text-[var(--text-primary)]">{category.category}</span>
                    {activeVariableCategory === category.category ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </button>
                  {activeVariableCategory === category.category && (
                    <div className="p-2 grid grid-cols-2 gap-1">
                      {category.variables.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => insertVariable(v.key)}
                          className="flex items-center gap-2 p-2 text-left hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/30 rounded-lg group transition-colors"
                        >
                          <Code className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-[var(--primary)] dark:text-[var(--primary)] truncate">
                              {v.key}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{v.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-[var(--text-primary)]">Contenu HTML</label>
              <button
                type="button"
                onClick={() => {
                  if (formData.type && DEFAULT_TEMPLATES[formData.type]) {
                    setFormData({ ...formData, content: DEFAULT_TEMPLATES[formData.type] });
                  }
                }}
                className="text-xs text-[var(--primary)] hover:text-[var(--primary)] flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Réinitialiser
              </button>
            </div>
            <textarea
              ref={contentRef}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full h-64 px-3 py-2 border rounded-lg font-mono text-xs bg-[var(--bg-elevated)] border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="<!DOCTYPE html>..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setPreviewTemplate({ ...formData, id: 'preview' } as DocumentTemplate);
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
        title="Prévisualisation du document"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--text-secondary)]">Les variables sont remplacées par des exemples</p>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          <div className={`border rounded-lg overflow-hidden bg-white ${isFullscreen ? 'h-[70vh]' : 'h-96'}`}>
            <iframe srcDoc={previewContent} className="w-full h-full" title="Preview" sandbox="allow-same-origin" />
          </div>

          <div className="flex justify-end gap-3">
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

export default DocumentTemplatesPanelV2;
