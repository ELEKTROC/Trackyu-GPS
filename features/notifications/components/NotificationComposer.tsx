/**
 * NotificationComposer - Composant de création et envoi de notifications manuelles
 * Permet la sélection groupée de clients et différents types de messages
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Send,
  Users,
  Mail,
  MessageCircle,
  Bell,
  Smartphone,
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Wrench,
  Receipt,
  Gift,
  Sparkles,
  MessageSquare,
  Check,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { useDataContext } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { logger } from '../../../utils/logger';
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_CHANNELS,
  type ManualNotificationType,
  type NotificationChannel,
  type NotificationRecipient,
  type NotificationTemplate,
  type ManualNotificationFormData,
} from '../types/manualNotification';
import {
  getClientsAsRecipients,
  sendNotification,
  createNotification,
  validateNotificationForm,
} from '../services/manualNotificationService';

interface NotificationComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Info,
  Wrench,
  Receipt,
  Gift,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  Bell,
  Smartphone,
  Mail,
  MessageCircle,
};

export const NotificationComposer: React.FC<NotificationComposerProps> = ({ isOpen, onClose, onSuccess }) => {
  const { clients } = useDataContext();
  const { user } = useAuth();
  const { showToast } = useToast();

  // États du formulaire
  const [selectedType, setSelectedType] = useState<ManualNotificationType>('INFO');
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(
    DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.type === 'INFO') || null
  );
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channels, setChannels] = useState<NotificationChannel[]>(['IN_APP']);
  const [sendImmediately, setSendImmediately] = useState(true);
  const [scheduledAt, setScheduledAt] = useState('');

  // États des destinataires
  const [recipientType, setRecipientType] = useState<'SELECTED' | 'ALL_CLIENTS'>('SELECTED');
  const [selectedRecipients, setSelectedRecipients] = useState<NotificationRecipient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  // State prepared for future recipient list expansion feature
  const [_showRecipientList, _setShowRecipientList] = useState(false);

  // États UI
  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'compose' | 'recipients' | 'confirm'>('compose');

  // Convertir les clients en destinataires
  const availableRecipients = useMemo(() => {
    return getClientsAsRecipients(clients);
  }, [clients]);

  // Filtrer les destinataires par recherche
  const filteredRecipients = useMemo(() => {
    if (!searchTerm) return availableRecipients;
    const term = searchTerm.toLowerCase();
    return availableRecipients.filter(
      (r) => r.name.toLowerCase().includes(term) || r.email?.toLowerCase().includes(term)
    );
  }, [availableRecipients, searchTerm]);

  // Gérer la sélection d'un template
  const handleTemplateSelect = useCallback((type: ManualNotificationType) => {
    setSelectedType(type);
    const template = DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.type === type);
    if (template) {
      setSelectedTemplate(template);
      setSubject(template.subject);
      setBody(template.body);
    }
  }, []);

  // Gérer la sélection des canaux
  const toggleChannel = useCallback((channel: NotificationChannel) => {
    setChannels((prev) => (prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]));
  }, []);

  // Gérer la sélection des destinataires
  const toggleRecipient = useCallback((recipient: NotificationRecipient) => {
    setSelectedRecipients((prev) => {
      const exists = prev.find((r) => r.id === recipient.id);
      if (exists) {
        return prev.filter((r) => r.id !== recipient.id);
      }
      return [...prev, recipient];
    });
  }, []);

  // Sélectionner/Désélectionner tous
  const toggleAllRecipients = useCallback(() => {
    if (selectedRecipients.length === filteredRecipients.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients([...filteredRecipients]);
    }
  }, [selectedRecipients.length, filteredRecipients]);

  // Valider et passer à l'étape suivante
  const handleNextStep = useCallback(() => {
    if (step === 'compose') {
      if (!subject.trim() || !body.trim()) {
        setErrors({
          subject: !subject.trim() ? 'Le sujet est requis' : '',
          body: !body.trim() ? 'Le contenu est requis' : '',
        });
        return;
      }
      setErrors({});
      setStep('recipients');
    } else if (step === 'recipients') {
      if (recipientType === 'SELECTED' && selectedRecipients.length === 0) {
        showToast(TOAST.COMM.RECIPIENTS_REQUIRED, 'warning');
        return;
      }
      setStep('confirm');
    }
  }, [
    step,
    selectedType,
    selectedTemplate,
    subject,
    body,
    recipientType,
    selectedRecipients,
    channels,
    sendImmediately,
    scheduledAt,
    showToast,
  ]);

  // Revenir à l'étape précédente
  const handlePrevStep = useCallback(() => {
    if (step === 'recipients') setStep('compose');
    else if (step === 'confirm') setStep('recipients');
  }, [step]);

  // Envoyer la notification
  const handleSend = useCallback(async () => {
    if (!user) return;

    setIsSending(true);
    try {
      const formData: ManualNotificationFormData = {
        type: selectedType,
        templateId: selectedTemplate?.id,
        subject,
        body,
        recipientType,
        recipientIds:
          recipientType === 'ALL_CLIENTS' ? availableRecipients.map((r) => r.id) : selectedRecipients.map((r) => r.id),
        channels,
        sendImmediately,
        scheduledAt: sendImmediately ? undefined : scheduledAt,
      };

      const validation = validateNotificationForm(formData);
      if (!validation.valid) {
        setErrors(validation.errors);
        showToast(TOAST.VALIDATION.FORM_ERRORS, 'error');
        setIsSending(false);
        return;
      }

      // Créer la notification
      const notification = await createNotification(formData, user.tenantId || '', user.id, user.name);

      // Envoyer si immédiat
      if (sendImmediately) {
        const recipients = recipientType === 'ALL_CLIENTS' ? availableRecipients : selectedRecipients;

        const result = await sendNotification(notification.id, recipients, channels);

        if (result.success) {
          showToast(TOAST.COMM.NOTIFICATION_SENT, 'success');
        } else {
          showToast(`Envoyée avec ${result.failureCount} échec(s) sur ${result.totalRecipients}`, 'warning');
        }
      } else {
        showToast(TOAST.COMM.NOTIFICATION_SCHEDULED, 'success');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      logger.error('Erreur envoi notification:', error);
      showToast(mapError(error, 'notification'), 'error');
    } finally {
      setIsSending(false);
    }
  }, [
    user,
    selectedType,
    selectedTemplate,
    subject,
    body,
    recipientType,
    selectedRecipients,
    availableRecipients,
    channels,
    sendImmediately,
    scheduledAt,
    onSuccess,
    onClose,
    showToast,
  ]);

  // Rendu du contenu selon l'étape
  const renderContent = () => {
    if (step === 'compose') {
      return (
        <div className="space-y-6">
          {/* Type de notification */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Type de message</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(NOTIFICATION_TYPE_CONFIG).map(([type, config]) => {
                const IconComponent = ICON_MAP[config.icon] || Info;
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleTemplateSelect(type as ManualNotificationType)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                      isSelected
                        ? `border-[var(--primary)] ${config.bgColor}`
                        : 'border-[var(--border)] hover:border-[var(--border)]'
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 ${isSelected ? config.color : 'text-[var(--text-muted)]'}`} />
                    <span
                      className={`text-xs font-medium ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                    >
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sujet */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Sujet</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Sujet de la notification..."
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] ${
                errors.subject ? 'border-red-300' : 'border-[var(--border)]'
              }`}
            />
            {errors.subject && <p className="mt-1 text-sm text-red-500">{errors.subject}</p>}
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Contenu de votre message..."
              rows={6}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] resize-none ${
                errors.body ? 'border-red-300' : 'border-[var(--border)]'
              }`}
            />
            {errors.body && <p className="mt-1 text-sm text-red-500">{errors.body}</p>}
            {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Variables disponibles : {selectedTemplate.variables.map((v) => `{{${v}}}`).join(', ')}
              </p>
            )}
          </div>

          {/* Canaux de diffusion */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Canaux de diffusion</label>
            <div className="flex gap-2">
              {NOTIFICATION_CHANNELS.map((channel) => {
                const IconComponent = ICON_MAP[channel.icon] || Bell;
                const isSelected = channels.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    onClick={() => toggleChannel(channel.id)}
                    className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border)]'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm font-medium">{channel.label}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
            {errors.channels && <p className="mt-1 text-sm text-red-500">{errors.channels}</p>}
          </div>

          {/* Programmation */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={sendImmediately}
                onChange={() => setSendImmediately(true)}
                className="w-4 h-4 text-[var(--primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">Envoyer immédiatement</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!sendImmediately}
                onChange={() => setSendImmediately(false)}
                className="w-4 h-4 text-[var(--primary)]"
              />
              <span className="text-sm text-[var(--text-primary)]">Programmer</span>
            </label>
            {!sendImmediately && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm"
              />
            )}
          </div>
        </div>
      );
    }

    if (step === 'recipients') {
      return (
        <div className="space-y-4">
          {/* Type de sélection */}
          <div className="flex gap-4">
            <button
              onClick={() => setRecipientType('SELECTED')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                recipientType === 'SELECTED'
                  ? 'border-[var(--primary)] bg-[var(--primary-dim)]'
                  : 'border-[var(--border)] hover:border-[var(--border)]'
              }`}
            >
              <Users className="w-6 h-6 text-[var(--primary)] mx-auto mb-2" />
              <p className="font-medium text-[var(--text-primary)]">Sélection manuelle</p>
              <p className="text-xs text-[var(--text-secondary)]">Choisir les clients un par un</p>
            </button>
            <button
              onClick={() => {
                setRecipientType('ALL_CLIENTS');
                setSelectedRecipients([...availableRecipients]);
              }}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                recipientType === 'ALL_CLIENTS'
                  ? 'border-[var(--primary)] bg-[var(--primary-dim)]'
                  : 'border-[var(--border)] hover:border-[var(--border)]'
              }`}
            >
              <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-[var(--text-primary)]">Tous les clients</p>
              <p className="text-xs text-[var(--text-secondary)]">{availableRecipients.length} client(s)</p>
            </button>
          </div>

          {recipientType === 'SELECTED' && (
            <>
              {/* Barre de recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un client..."
                  className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg"
                />
              </div>

              {/* Sélectionner tous */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">
                  {selectedRecipients.length} sélectionné(s) sur {filteredRecipients.length}
                </span>
                <button
                  onClick={toggleAllRecipients}
                  className="text-sm text-[var(--primary)] hover:text-[var(--primary)]"
                >
                  {selectedRecipients.length === filteredRecipients.length
                    ? 'Tout désélectionner'
                    : 'Tout sélectionner'}
                </button>
              </div>

              {/* Liste des destinataires */}
              <div className="max-h-64 overflow-y-auto border border-[var(--border)] rounded-lg divide-y">
                {filteredRecipients.map((recipient) => {
                  const isSelected = selectedRecipients.some((r) => r.id === recipient.id);
                  return (
                    <label
                      key={recipient.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--bg-elevated)] ${
                        isSelected ? 'bg-[var(--primary-dim)]' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRecipient(recipient)}
                        className="w-4 h-4 text-[var(--primary)] rounded"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{recipient.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {recipient.email || "Pas d'email"}
                          {recipient.phone && ` • ${recipient.phone}`}
                        </p>
                      </div>
                      {isSelected && <CheckCircle className="w-4 h-4 text-[var(--primary)]" />}
                    </label>
                  );
                })}
                {filteredRecipients.length === 0 && (
                  <div className="p-8 text-center text-[var(--text-muted)]">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun client trouvé</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      );
    }

    // Étape de confirmation
    return (
      <div className="space-y-6">
        <div className="bg-[var(--bg-elevated)] p-4 rounded-lg space-y-4">
          <h4 className="font-bold text-[var(--text-primary)]">Récapitulatif</h4>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--text-secondary)]">Type :</span>
              <span className="ml-2 font-medium">{NOTIFICATION_TYPE_CONFIG[selectedType].label}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Canaux :</span>
              <span className="ml-2 font-medium">
                {channels.map((c) => NOTIFICATION_CHANNELS.find((nc) => nc.id === c)?.label).join(', ')}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Destinataires :</span>
              <span className="ml-2 font-medium">
                {recipientType === 'ALL_CLIENTS'
                  ? `Tous (${availableRecipients.length})`
                  : `${selectedRecipients.length} sélectionné(s)`}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">Envoi :</span>
              <span className="ml-2 font-medium">
                {sendImmediately ? 'Immédiat' : `Programmé le ${new Date(scheduledAt).toLocaleString()}`}
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-sm text-[var(--text-secondary)] mb-1">Sujet :</p>
            <p className="font-medium text-[var(--text-primary)]">{subject}</p>
          </div>

          <div>
            <p className="text-sm text-[var(--text-secondary)] mb-1">Message :</p>
            <div className="bg-[var(--bg-elevated)] p-3 rounded border border-[var(--border)] text-sm whitespace-pre-wrap">
              {body}
            </div>
          </div>
        </div>

        {recipientType === 'SELECTED' && selectedRecipients.length > 0 && (
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
              Destinataires ({selectedRecipients.length}) :
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedRecipients.slice(0, 10).map((r) => (
                <span key={r.id} className="px-2 py-1 bg-[var(--primary-dim)] text-[var(--primary)] rounded text-xs">
                  {r.name}
                </span>
              ))}
              {selectedRecipients.length > 10 && (
                <span className="px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded text-xs">
                  +{selectedRecipients.length - 10} autres
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle notification">
      <div className="p-6">
        {/* Étapes */}
        <div className="flex items-center gap-2 mb-6">
          {['compose', 'recipients', 'confirm'].map((s, i) => (
            <React.Fragment key={s}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  step === s
                    ? 'bg-[var(--primary)] text-white'
                    : i < ['compose', 'recipients', 'confirm'].indexOf(step)
                      ? 'bg-green-100 text-green-600'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                }`}
              >
                {i < ['compose', 'recipients', 'confirm'].indexOf(step) ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`flex-1 h-0.5 ${
                    i < ['compose', 'recipients', 'confirm'].indexOf(step) ? 'bg-green-200' : 'bg-[var(--bg-elevated)]'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Contenu */}
        {renderContent()}

        {/* Actions */}
        <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={step === 'compose' ? onClose : handlePrevStep}
            className="px-4 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {step === 'compose' ? 'Annuler' : 'Retour'}
          </button>

          {step === 'confirm' ? (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] disabled:opacity-50 flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {sendImmediately ? 'Envoyer maintenant' : 'Programmer'}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNextStep}
              className="px-6 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] flex items-center gap-2"
            >
              Suivant
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NotificationComposer;
