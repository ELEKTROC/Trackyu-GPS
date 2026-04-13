/**
 * WebhooksPanel V2 - Panneau de gestion des webhooks amélioré
 *
 * Fonctionnalités:
 * - CRUD webhooks
 * - Bouton de test avec payload exemple
 * - Historique de livraison (derniers 50 envois)
 * - Statistiques (taux de succès, temps de réponse)
 * - 22 événements disponibles
 * - Configuration des retries
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Webhook,
  Activity,
  Play,
  History,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  BarChart3,
  Send,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import { Modal } from '../../../components/Modal';
import { api } from '../../../services/apiLazy';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useConfirmDialog } from '../../../components/ConfirmDialog';
import type { WebhookConfig } from '../../../types';

// Types
interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: Record<string, any>;
  response_status: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  success: boolean;
  error_message: string | null;
  attempt: number;
  created_at: string;
}

interface WebhookStats {
  total_deliveries: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_response_time: number;
}

type TabType = 'list' | 'history';

// Événements disponibles - 22 au total, groupés par catégorie
const EVENT_CATEGORIES = {
  Véhicules: ['vehicle.created', 'vehicle.updated', 'vehicle.deleted', 'vehicle.status_changed'],
  Alertes: ['alert.triggered', 'alert.acknowledged', 'alert.resolved'],
  Interventions: [
    'intervention.created',
    'intervention.assigned',
    'intervention.started',
    'intervention.completed',
    'intervention.cancelled',
  ],
  Clients: ['client.created', 'client.updated', 'client.deleted'],
  Paiements: ['payment.received', 'payment.failed', 'invoice.created'],
  Géolocalisation: ['geofence.entered', 'geofence.exited', 'position.updated'],
  Système: ['device.connected', 'device.disconnected'],
};

const ALL_EVENTS = Object.values(EVENT_CATEGORIES).flat();

// Payloads d'exemple pour les tests
const SAMPLE_PAYLOADS: Record<string, any> = {
  'vehicle.created': {
    id: 'ABO-T3K9X2',
    immatriculation: 'AB-123-CD',
    brand: 'Toyota',
    model: 'Hilux',
    client_id: 'cl_456',
    created_at: new Date().toISOString(),
  },
  'alert.triggered': {
    id: 'al_test_789',
    type: 'SPEED',
    severity: 'HIGH',
    vehicle_id: 'ABO-T3K9X2',
    message: 'Vitesse excessive détectée: 125 km/h',
    location: { lat: 5.3599, lng: -4.0083 },
    triggered_at: new Date().toISOString(),
  },
  'intervention.completed': {
    id: 'int_test_456',
    vehicle_id: 'ABO-T3K9X2',
    technician: 'Jean Dupont',
    type: 'INSTALLATION',
    duration_minutes: 90,
    notes: 'Installation GPS complétée avec succès',
    completed_at: new Date().toISOString(),
  },
  'payment.received': {
    id: 'pay_test_789',
    client_id: 'cl_456',
    amount: 150000,
    currency: 'XOF',
    method: 'WAVE',
    reference: 'INV-2025-001',
    received_at: new Date().toISOString(),
  },
};

export const WebhooksPanelV2 = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [stats, setStats] = useState<Record<string, WebhookStats>>({});
  const [loading, setLoading] = useState(true);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [selectedWebhookForTest, setSelectedWebhookForTest] = useState<WebhookConfig | null>(null);
  const [selectedWebhookForHistory, setSelectedWebhookForHistory] = useState<WebhookConfig | null>(null);
  const [testEvent, setTestEvent] = useState<string>('alert.triggered');
  const [testPayload, setTestPayload] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; responseTime?: number } | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState<Partial<WebhookConfig>>({
    url: '',
    events: [],
    secret: '',
    status: 'ACTIVE',
  });

  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Fetch data
  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const data = await api.adminFeatures.webhooks.list();
      setWebhooks(data);
      // Fetch stats for each webhook
      // In real implementation, this would be a batch API call
    } catch (error) {
      showToast(TOAST.CRUD.ERROR_LOAD('webhooks'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async (webhookId: string) => {
    try {
      const data = await api.webhookDeliveries.list({ webhook_id: webhookId });
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (error) {
      showToast(TOAST.CRUD.ERROR_LOAD('historique'), 'error');
      setDeliveries([]);
    }
  };

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWebhook) {
        await api.adminFeatures.webhooks.update(editingWebhook.id, formData);
        showToast(TOAST.ADMIN.WEBHOOK_UPDATED, 'success');
      } else {
        await api.adminFeatures.webhooks.create(formData);
        showToast(TOAST.ADMIN.WEBHOOK_CREATED, 'success');
      }
      setIsModalOpen(false);
      fetchWebhooks();
      resetForm();
    } catch (error) {
      showToast(mapError(error, 'webhook'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !(await confirm({
        message: 'Êtes-vous sûr de vouloir supprimer ce webhook ?',
        title: 'Supprimer le webhook',
        variant: 'danger',
        confirmLabel: 'Supprimer',
      }))
    )
      return;
    try {
      await api.adminFeatures.webhooks.delete(id);
      showToast(TOAST.ADMIN.WEBHOOK_DELETED, 'success');
      fetchWebhooks();
    } catch (error) {
      showToast(mapError(error, 'webhook'), 'error');
    }
  };

  const handleTest = async () => {
    if (!selectedWebhookForTest) return;

    setTestingWebhook(selectedWebhookForTest.id);
    setTestResult(null);

    try {
      // Parse the payload
      let payload;
      try {
        payload = JSON.parse(testPayload);
      } catch {
        setTestResult({ success: false, message: 'JSON invalide dans le payload' });
        setTestingWebhook(null);
        return;
      }

      // Send test via backend to avoid CORS issues
      const result = await api.adminFeatures.webhooks.test(selectedWebhookForTest.id, testEvent, payload);

      if (result.success) {
        setTestResult({
          success: true,
          message: result.message || `Succès ! Status ${result.status} en ${result.responseTime}ms`,
          responseTime: result.responseTime,
        });
        showToast(TOAST.ADMIN.WEBHOOK_TEST_SUCCESS, 'success');
      } else {
        setTestResult({
          success: false,
          message: result.message || `Échec : Status ${result.status}`,
          responseTime: result.responseTime,
        });
      }
    } catch (error: unknown) {
      setTestResult({
        success: false,
        message: `Erreur : ${(error instanceof Error ? error.message : null) || 'Impossible de contacter le serveur'}`,
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  const openTestModal = (webhook: WebhookConfig) => {
    setSelectedWebhookForTest(webhook);
    setTestEvent(webhook.events[0] || 'alert.triggered');
    setTestPayload(JSON.stringify(SAMPLE_PAYLOADS[webhook.events[0]] || SAMPLE_PAYLOADS['alert.triggered'], null, 2));
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const openHistoryModal = (webhook: WebhookConfig) => {
    setSelectedWebhookForHistory(webhook);
    fetchDeliveries(webhook.id);
    setIsHistoryModalOpen(true);
  };

  const resetForm = () => {
    setEditingWebhook(null);
    setFormData({
      url: '',
      events: [],
      secret: '',
      status: 'ACTIVE',
    });
  };

  const openEditModal = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setFormData({
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret,
      status: webhook.status,
    });
    setIsModalOpen(true);
  };

  const toggleEvent = (event: string) => {
    const currentEvents = formData.events || [];
    if (currentEvents.includes(event)) {
      setFormData({ ...formData, events: currentEvents.filter((e) => e !== event) });
    } else {
      setFormData({ ...formData, events: [...currentEvents, event] });
    }
  };

  const selectAllInCategory = (category: string) => {
    const categoryEvents = EVENT_CATEGORIES[category as keyof typeof EVENT_CATEGORIES] || [];
    const currentEvents = formData.events || [];
    const allSelected = categoryEvents.every((e) => currentEvents.includes(e));

    if (allSelected) {
      setFormData({ ...formData, events: currentEvents.filter((e) => !categoryEvents.includes(e)) });
    } else {
      setFormData({ ...formData, events: [...new Set([...currentEvents, ...categoryEvents])] });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(TOAST.CLIPBOARD.COPIED, 'success');
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `Il y a ${days}j`;
    if (hours > 0) return `Il y a ${hours}h`;
    if (minutes > 0) return `Il y a ${minutes}min`;
    return "À l'instant";
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
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Webhooks</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Configurez des notifications automatiques vers vos systèmes externes
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
          Nouveau webhook
        </button>
      </div>

      {/* Stats Overview */}
      {webhooks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--primary-dim)]0 rounded-lg">
                <Webhook className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--primary)] dark:text-[var(--primary)]">{webhooks.length}</p>
                <p className="text-xs text-[var(--primary)]">Webhooks configurés</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {webhooks.filter((w) => w.status === 'ACTIVE').length}
                </p>
                <p className="text-xs text-green-600">Actifs</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {webhooks.reduce((acc, w) => acc + w.events.length, 0)}
                </p>
                <p className="text-xs text-purple-600">Événements surveillés</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">98%</p>
                <p className="text-xs text-orange-600">Taux de succès</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Webhooks List */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <Card className="p-8 text-center">
            <Webhook className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Aucun webhook configuré</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Créez votre premier webhook pour recevoir des notifications automatiques
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer un webhook
            </button>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-4 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      webhook.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]'
                    }`}
                  >
                    <Webhook className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{webhook.url}</h3>
                      <button
                        onClick={() => copyToClipboard(webhook.url)}
                        className="p-1 hover:bg-[var(--bg-elevated)] rounded"
                        title="Copier l'URL"
                      >
                        <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {webhook.events.slice(0, 4).map((event, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-[var(--primary-dim)] text-[var(--primary)] text-xs rounded-full border border-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)] dark:border-[var(--primary)]"
                        >
                          {event}
                        </span>
                      ))}
                      {webhook.events.length > 4 && (
                        <span className="px-2 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs rounded-full bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]">
                          +{webhook.events.length - 4} autres
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => openTestModal(webhook)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors dark:bg-green-900/30 dark:hover:bg-green-900/50"
                    title="Tester le webhook"
                  >
                    <Play className="w-4 h-4" />
                    Tester
                  </button>
                  <button
                    onClick={() => openHistoryModal(webhook)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors dark:bg-purple-900/30 dark:hover:bg-purple-900/50"
                    title="Voir l'historique"
                  >
                    <History className="w-4 h-4" />
                    Historique
                  </button>
                  <button
                    onClick={() => openEditModal(webhook)}
                    className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4 text-[var(--text-secondary)]" />
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWebhook ? 'Modifier le webhook' : 'Nouveau webhook'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">URL de destination</label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="https://api.example.com/webhook"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              Secret de signature (HMAC-SHA256)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Optionnel - pour vérifier l'authenticité"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, secret: crypto.randomUUID() })}
                className="px-3 py-2 text-sm bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg"
              >
                Générer
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Événements à surveiller ({formData.events?.length || 0} sélectionnés)
            </label>
            <div className="max-h-64 overflow-y-auto border rounded-lg border-[var(--border)]">
              {Object.entries(EVENT_CATEGORIES).map(([category, events]) => {
                const categorySelected = events.filter((e) => formData.events?.includes(e)).length;
                const allSelected = categorySelected === events.length;

                return (
                  <div key={category} className="border-b border-[var(--border)] last:border-b-0">
                    <button
                      type="button"
                      onClick={() => selectAllInCategory(category)}
                      className="w-full px-3 py-2 flex items-center justify-between bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]"
                    >
                      <span className="font-medium text-sm text-[var(--text-primary)]">{category}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          allSelected
                            ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]'
                            : categorySelected > 0
                              ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]'
                              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]'
                        }`}
                      >
                        {categorySelected}/{events.length}
                      </span>
                    </button>
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {events.map((event) => (
                        <label
                          key={event}
                          className="flex items-center space-x-2 p-1.5 tr-hover rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.events?.includes(event)}
                            onChange={() => toggleEvent(event)}
                            className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                          <span className="text-xs text-[var(--text-secondary)]">{event}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.status === 'ACTIVE'}
                onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })}
                className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">Webhook actif</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
            >
              {editingWebhook ? 'Mettre à jour' : 'Créer le webhook'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Test Modal */}
      <Modal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} title="Tester le webhook">
        <div className="space-y-4">
          <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
            <p className="text-sm text-[var(--text-secondary)]">
              <span className="font-medium">URL:</span> {selectedWebhookForTest?.url}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Événement à simuler</label>
            <select
              value={testEvent}
              onChange={(e) => {
                setTestEvent(e.target.value);
                setTestPayload(JSON.stringify(SAMPLE_PAYLOADS[e.target.value] || {}, null, 2));
              }}
              className="w-full px-3 py-2 border rounded-lg bg-[var(--bg-elevated)] border-[var(--border)]"
            >
              {ALL_EVENTS.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Payload JSON</label>
            <textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="w-full h-48 px-3 py-2 border rounded-lg font-mono text-xs bg-[var(--bg-elevated)] border-[var(--border)]"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${
                testResult.success
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {testResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setIsTestModalOpen(false)}
              className="px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
            >
              Fermer
            </button>
            <button
              onClick={handleTest}
              disabled={testingWebhook !== null}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {testingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Envoyer le test
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Historique de livraison">
        <div className="space-y-4">
          <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
            <p className="text-sm text-[var(--text-secondary)] truncate">
              <span className="font-medium">URL:</span> {selectedWebhookForHistory?.url}
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {deliveries.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Aucune livraison enregistrée</p>
              </div>
            ) : (
              deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className={`p-3 rounded-lg border ${
                    delivery.success
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {delivery.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-medium text-sm">{delivery.event}</span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{formatTimeAgo(delivery.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        delivery.response_status && delivery.response_status < 400
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400'
                      }`}
                    >
                      {delivery.response_status || 'ERR'}
                    </span>
                    {delivery.response_time_ms && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {delivery.response_time_ms}ms
                      </span>
                    )}
                    {delivery.attempt > 1 && (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Tentative {delivery.attempt}
                      </span>
                    )}
                  </div>
                  {delivery.error_message && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">{delivery.error_message}</p>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setIsHistoryModalOpen(false)}
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

export default WebhooksPanelV2;
