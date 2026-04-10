import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import type { Task } from '../../../types';
import { Card } from '../../../components/Card';
import { TaskForm } from './TaskForm';
import { ListTodo, CheckCircle, Clock, AlertCircle, Search, Trash2, Edit, Bell, SearchX } from 'lucide-react';
import { EmptyState } from '../../../components/EmptyState';
import { useConfirmDialog } from '../../../components/ConfirmDialog';

export const TasksView: React.FC = () => {
  const { tasks, deleteTask, updateTask } = useDataContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'TODO' | 'DONE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesStatus = filterStatus === 'ALL' 
        ? true 
        : filterStatus === 'DONE' 
          ? task.status === 'DONE' 
          : task.status !== 'DONE';
      
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());
  }, [tasks, filterStatus, searchQuery]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ message: 'Êtes-vous sûr de vouloir supprimer cette tâche ?', variant: 'danger', title: 'Confirmer la suppression', confirmLabel: 'Supprimer' })) {
      deleteTask(id);
    }
  };

  const handleToggleStatus = (task: Task) => {
    updateTask({
      ...task,
      status: task.status === 'DONE' ? 'TODO' : 'DONE'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'HIGH': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
      case 'LOW': return 'text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'Urgente';
      case 'HIGH': return 'Haute';
      case 'MEDIUM': return 'Moyenne';
      case 'LOW': return 'Basse';
      default: return priority;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'TODO': return 'À faire';
      case 'IN_PROGRESS': return 'En cours';
      case 'DONE': return 'Terminé';
      case 'BLOCKED': return 'Bloqué';
      default: return status;
    }
  };

  const getReminderLabel = (reminder?: string) => {
    switch (reminder) {
      case '15M': return '15 min';
      case '30M': return '30 min';
      case '1H': return '1h';
      case '2H': return '2h';
      case '1D': return '1 jour';
      case '2D': return '2 jours';
      case '1W': return '1 sem.';
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ListTodo className="w-8 h-8 text-[var(--primary)]" />
            Gestion des Tâches
          </h2>
          <p className="text-slate-500">Suivez vos relances et actions commerciales</p>
        </div>
        <button
          onClick={() => { setEditingTask(undefined); setIsFormOpen(true); }}
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold hover:bg-[var(--primary-light)] flex items-center gap-2"
        >
          <ListTodo className="w-4 h-4" /> Nouvelle Tâche
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une tâche..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterStatus === 'ALL' ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
          >
            Tout
          </button>
          <button
            onClick={() => setFilterStatus('TODO')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterStatus === 'TODO' ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
          >
            À faire
          </button>
          <button
            onClick={() => setFilterStatus('DONE')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${filterStatus === 'DONE' ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
          >
            Terminé
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pb-16 lg:pb-0">
        {filteredTasks.length === 0 ? (
          (tasks.length === 0
            ? <EmptyState icon={ListTodo} title="Aucune tâche" description="Créez votre première tâche pour organiser votre suivi commercial." actionLabel="Nouvelle tâche" onAction={() => { setEditingTask(undefined); setIsFormOpen(true); }} />
            : <EmptyState icon={SearchX} title="Aucun résultat" description="Aucune tâche ne correspond à votre recherche ou au filtre actif." />)
        ) : (
          filteredTasks.map(task => (
            <Card key={task.id} className={`p-4 hover:shadow-md transition-shadow border-l-4 ${task.status === 'DONE' ? 'border-l-green-500 opacity-75' : task.status === 'BLOCKED' ? 'border-l-orange-500' : task.priority === 'URGENT' ? 'border-l-purple-500' : task.priority === 'HIGH' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleStatus(task)}
                  className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'DONE' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-[var(--primary)]'}`}
                >
                  {task.status === 'DONE' && <CheckCircle className="w-3 h-3" />}
                </button>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-semibold text-lg ${task.status === 'DONE' ? 'line-through text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                      {task.status === 'BLOCKED' && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20">
                          Bloqué
                        </span>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20">
                          En cours
                        </span>
                      )}
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(task)} className="p-1 text-slate-400 hover:text-[var(--primary)]">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(task.id)} className="p-1 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {task.description && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500 font-bold' : ''}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' à '}
                        {new Date(task.dueDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                    {task.reminder && task.reminder !== 'NONE' && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded">
                        <Bell className="w-3 h-3" />
                        {getReminderLabel(task.reminder)}
                      </div>
                    )}
                    {task.relatedTo && (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        <span className="font-semibold">{task.relatedTo.type}:</span>
                        {task.relatedTo.name}
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                          {((task as Task & { assignedUserName?: string }).assignedUserName || task.assignedTo).charAt(0).toUpperCase()}
                        </div>
                        {(task as Task & { assignedUserName?: string }).assignedUserName || task.assignedTo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <TaskForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingTask(undefined); }} 
        task={editingTask}
      />
      <ConfirmDialogComponent />
    </div>
  );
};
