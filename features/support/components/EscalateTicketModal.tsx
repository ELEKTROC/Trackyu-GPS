import React, { useState } from 'react';
import { AlertTriangle, X, User, ArrowUpRight } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { api } from '../../../services/apiLazy';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useDataContext } from '../../../contexts/DataContext';
import { TICKET_ASSIGNABLE_ROLES } from '../constants';

interface EscalateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  currentPriority: string;
  onSuccess: () => void;
}

const PRIORITY_LEVELS = [
  { value: 'LOW', label: 'Basse', color: 'text-slate-600' },
  { value: 'MEDIUM', label: 'Moyenne', color: 'text-[var(--primary)]' },
  { value: 'HIGH', label: 'Haute', color: 'text-orange-600' },
  { value: 'CRITICAL', label: 'Critique', color: 'text-red-600' },
];

const ESCALATION_REASONS = [
  'Dépassement SLA',
  'Problème critique',
  'Demande client urgente',
  'Compétences techniques requises',
  'Décision managériale nécessaire',
  'Autre (préciser ci-dessous)',
];

export const EscalateTicketModal: React.FC<EscalateTicketModalProps> = ({
  isOpen,
  onClose,
  ticketId,
  currentPriority,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const { users } = useDataContext();
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const finalReason = selectedReason === 'Autre (préciser ci-dessous)' ? reason : selectedReason;

    if (!finalReason.trim()) {
      showToast(TOAST.SUPPORT.REASON_REQUIRED, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.tickets.escalate(ticketId, {
        reason: finalReason,
        escalatedTo: assignTo || undefined,
      });

      showToast(TOAST.SUPPORT.TICKET_ESCALATED, 'success');
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      showToast(mapError(error, 'ticket'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setSelectedReason('');
    setAssignTo('');
    onClose();
  };

  const getNextPriority = (): string => {
    const currentIndex = PRIORITY_LEVELS.findIndex((p) => p.value === currentPriority);
    if (currentIndex < PRIORITY_LEVELS.length - 1) {
      return PRIORITY_LEVELS[currentIndex + 1].label;
    }
    return PRIORITY_LEVELS[currentIndex].label;
  };

  // Escalade: assigner uniquement au staff support (pas aux techniciens terrain)
  const supportUsers = users.filter((u) => (TICKET_ASSIGNABLE_ROLES as readonly string[]).includes(u.role));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Escalader le Ticket">
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
              L'escalade augmentera automatiquement la priorité
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
              Priorité actuelle: <span className="font-bold">{currentPriority}</span> →{' '}
              <span className="font-bold">{getNextPriority()}</span>
            </p>
          </div>
        </div>

        {/* Raison prédéfinie */}
        <div>
          <label
            htmlFor="escalate-reason"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Raison de l'escalade *
          </label>
          <select
            id="escalate-reason"
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="">-- Sélectionner une raison --</option>
            {ESCALATION_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Raison personnalisée */}
        {selectedReason === 'Autre (préciser ci-dessous)' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Précisez la raison
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent resize-none"
              rows={3}
              placeholder="Décrivez la raison de l'escalade..."
            />
          </div>
        )}

        {/* Assignation (optionnel) */}
        <div>
          <label htmlFor="assign-to" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            Assigner à (optionnel)
          </label>
          <select
            id="assign-to"
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          >
            <option value="">-- Aucune assignation --</option>
            {supportUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">Laisser vide pour conserver l'assignation actuelle</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedReason && !reason.trim())}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            {isSubmitting ? 'Escalade...' : 'Escalader'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
