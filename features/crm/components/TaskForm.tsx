import React, { useState, useEffect } from 'react';
import { Task, Lead, Client } from '../../../types';
import { Modal } from '../../../components/Modal';
import { useDataContext } from '../../../contexts/DataContext';
import { useToast } from '../../../contexts/ToastContext';
import { Calendar, Clock, User, AlertCircle, Link as LinkIcon, Bell } from 'lucide-react';
import { FormField, Input, Select, Textarea, FormGrid } from '../../../components/form';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task;
  initialRelatedTo?: { type: 'LEAD' | 'CLIENT' | 'QUOTE' | 'INVOICE', id: string, name?: string };
}

/** Split an ISO/TIMESTAMPTZ string into { date: 'YYYY-MM-DD', time: 'HH:MM' } */
function splitDateTime(iso?: string): { date: string; time: string } {
  if (!iso) {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    };
  }
  const d = new Date(iso);
  return {
    date: d.toISOString().split('T')[0],
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  };
}

/** Merge date + time strings into ISO string */
function mergeDateTime(date: string, time: string): string {
  if (!date) return '';
  const t = time || '09:00';
  return new Date(`${date}T${t}`).toISOString();
}

export const TaskForm: React.FC<TaskFormProps> = ({ isOpen, onClose, task, initialRelatedTo }) => {
  const { addTask, updateTask, leads, clients, users, quotes } = useDataContext();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '',
    assignedTo: '',
    relatedTo: initialRelatedTo
  });

  // Separate date & time state
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('09:00');

  useEffect(() => {
    if (task) {
      const { date, time } = splitDateTime(task.dueDate);
      setDueDate(date);
      setDueTime(time);
      setFormData({
        ...task,
        dueDate: task.dueDate || ''
      });
    } else {
      const { date, time } = splitDateTime();
      setDueDate(date);
      setDueTime(time);
      setFormData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: '',
        assignedTo: '',
        relatedTo: initialRelatedTo
      });
    }
    setSubmitting(false);
    setHasChanges(false);
  }, [task, initialRelatedTo, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      showToast(TOAST.CRM.TASK_TITLE_REQUIRED, 'error');
      return;
    }
    setSubmitting(true);

    const dueDateISO = dueDate ? mergeDateTime(dueDate, dueTime) : undefined;

    const taskPayload: Partial<Task> = {
      title: formData.title.trim(),
      description: formData.description || undefined,
      priority: formData.priority || 'MEDIUM',
      status: formData.status || 'TODO',
      dueDate: dueDateISO,
      reminder: formData.reminder || 'NONE',
      assignedTo: formData.assignedTo || undefined,
      relatedTo: formData.relatedTo?.id ? formData.relatedTo : undefined,
    };

    try {
      if (task?.id) {
        await updateTask({ ...taskPayload, id: task.id } as Task);
        showToast(TOAST.CRM.TASK_UPDATED, 'success');
      } else {
        await addTask(taskPayload as Task);
        showToast(TOAST.CRM.TASK_CREATED, 'success');
      }
      setHasChanges(false);
      onClose();
    } catch (error: unknown) {
      console.error('[TaskForm] Error:', error);
      showToast(mapError(error, 'tâche'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={task ? "Modifier la Tâche" : "Nouvelle Tâche"} isDirty={hasChanges}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Titre" required>
          <Input
            required
            value={formData.title}
            onChange={e => { setFormData({ ...formData, title: e.target.value }); setHasChanges(true); }}
            placeholder="Ex: Relancer client..."
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            rows={3}
            value={formData.description}
            onChange={e => { setFormData({ ...formData, description: e.target.value }); setHasChanges(true); }}
            placeholder="Détails de la tâche..."
          />
        </FormField>

        <FormGrid columns={2}>
          <FormField label="Priorité">
            <Select
              value={formData.priority}
              onChange={e => { setFormData({ ...formData, priority: e.target.value as Task['priority'] }); setHasChanges(true); }}
            >
              <option value="LOW">Basse</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="HIGH">Haute</option>
              <option value="URGENT">Urgente</option>
            </Select>
          </FormField>
          <FormField label="Statut">
            <Select
              value={formData.status}
              onChange={e => { setFormData({ ...formData, status: e.target.value as Task['status'] }); setHasChanges(true); }}
            >
              <option value="TODO">À faire</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="DONE">Terminé</option>
              <option value="BLOCKED">Bloqué</option>
            </Select>
          </FormField>
        </FormGrid>

        <FormGrid columns={2}>
          <FormField label="Date d'échéance">
            <Input
              type="date"
              value={dueDate}
              onChange={e => { setDueDate(e.target.value); setHasChanges(true); }}
            />
          </FormField>
          <FormField label="Heure">
            <Input
              type="time"
              value={dueTime}
              onChange={e => { setDueTime(e.target.value); setHasChanges(true); }}
            />
          </FormField>
        </FormGrid>

        <FormField label="Assigné à">
          <Select
            value={formData.assignedTo || ''}
            onChange={e => { setFormData({ ...formData, assignedTo: e.target.value || undefined }); setHasChanges(true); }}
          >
            <option value="">-- Non assigné --</option>
            {(users || []).filter(u => u.status === 'Actif').map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </FormField>

        {/* Reminder */}
        <FormField label="Rappel avant échéance">
          <Select
            value={formData.reminder || 'NONE'}
            onChange={e => { setFormData({ ...formData, reminder: e.target.value as Task['reminder'] }); setHasChanges(true); }}
          >
            <option value="NONE">Aucun rappel</option>
            <option value="15M">15 minutes avant</option>
            <option value="30M">30 minutes avant</option>
            <option value="1H">1 heure avant</option>
            <option value="2H">2 heures avant</option>
            <option value="1D">1 jour avant</option>
            <option value="2D">2 jours avant</option>
            <option value="1W">1 semaine avant</option>
          </Select>
        </FormField>

        {/* Related To Section */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
          <FormField label="Lier à">
            <FormGrid columns={2}>
              <Select
                value={formData.relatedTo?.type || ''}
                onChange={e => {
                  const type = e.target.value as NonNullable<Task['relatedTo']>['type'] | '';
                  setFormData({ ...formData, relatedTo: type ? { type, id: '', name: '' } : undefined });
                  setHasChanges(true);
                }}
              >
                <option value="">-- Aucun --</option>
                <option value="LEAD">Lead</option>
                <option value="CLIENT">Client</option>
                <option value="QUOTE">Devis</option>
              </Select>

              {formData.relatedTo?.type === 'LEAD' && (
                <Select
                  value={formData.relatedTo.id}
                  onChange={e => {
                    const lead = leads.find(l => l.id === e.target.value);
                    setFormData({
                      ...formData,
                      relatedTo: { type: 'LEAD', id: e.target.value, name: lead?.companyName }
                    });
                    setHasChanges(true);
                  }}
                >
                  <option value="">Sélectionner un Lead</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.companyName}</option>
                  ))}
                </Select>
              )}

              {formData.relatedTo?.type === 'CLIENT' && (
                <Select
                  value={formData.relatedTo.id}
                  onChange={e => {
                    const client = clients.find(c => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      relatedTo: { type: 'CLIENT', id: e.target.value, name: client?.name }
                    });
                    setHasChanges(true);
                  }}
                >
                  <option value="">Sélectionner un Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              )}

              {formData.relatedTo?.type === 'QUOTE' && (
                <Select
                  value={formData.relatedTo.id}
                  onChange={e => {
                    const quote = (quotes || []).find(q => q.id === e.target.value);
                    setFormData({
                      ...formData,
                      relatedTo: { type: 'QUOTE', id: e.target.value, name: quote?.number || `Devis #${e.target.value.slice(0, 8)}` }
                    });
                    setHasChanges(true);
                  }}
                >
                  <option value="">Sélectionner un Devis</option>
                  {(quotes || []).map(q => (
                    <option key={q.id} value={q.id}>{q.number || `Devis #${q.id.slice(0, 8)}`}</option>
                  ))}
                </Select>
              )}
            </FormGrid>
          </FormField>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg dark:text-slate-300 dark:hover:bg-slate-800 font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {submitting ? 'En cours...' : (task ? 'Mettre à jour' : 'Créer')}
          </button>
        </div>
      </form>
    </Modal>
  );
};
