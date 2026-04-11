import React, { useMemo } from 'react';
import { Card } from '../../../../components/Card';
import { Wrench, Briefcase, Clock, Users } from 'lucide-react';
import type { Intervention, Task, User } from '../../../../types';
import { isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';

interface AgendaStatsProps {
  currentDate: Date;
  interventions: Intervention[];
  tasks: Task[];
  users: User[];
  selectedAgentId: string;
}

export const AgendaStats: React.FC<AgendaStatsProps> = ({
  currentDate,
  interventions,
  tasks,
  users,
  selectedAgentId,
}) => {
  // Calcul du taux d'occupation
  // Formule: (Nombre d'événements planifiés / Capacité théorique) × 100
  // Capacité théorique = Nombre d'agents × Jours ouvrés du mois × 4 créneaux/jour (matin AM, matin PM, après-midi AM, après-midi PM)
  const occupationRate = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    // Jours ouvrés du mois (exclure weekends)
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const workDays = allDays.filter((day) => !isWeekend(day)).length;

    // Nombre d'agents (techniciens + commerciaux)
    const agentCount =
      selectedAgentId !== 'ALL'
        ? 1
        : users.filter((u) => u.role === 'TECHNICIAN' || u.role === 'COMMERCIAL').length || 1;

    // Capacité théorique: 4 créneaux par jour par agent
    const SLOTS_PER_DAY = 4;
    const theoreticalCapacity = agentCount * workDays * SLOTS_PER_DAY;

    // Événements du mois (filtrés par agent si sélectionné)
    const monthInterventions = interventions.filter((i) => {
      if (!i.scheduledDate) return false;
      const date = new Date(i.scheduledDate);
      if (!isSameMonth(date, currentDate)) return false;
      if (selectedAgentId !== 'ALL' && i.technicianId !== selectedAgentId) return false;
      return true;
    });

    const monthTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const date = new Date(t.dueDate);
      if (!isSameMonth(date, currentDate)) return false;
      if (selectedAgentId !== 'ALL' && t.assignedTo !== selectedAgentId) return false;
      return true;
    });

    const totalEvents = monthInterventions.length + monthTasks.length;

    // Taux d'occupation (max 100%)
    const rate = theoreticalCapacity > 0 ? Math.min(100, Math.round((totalEvents / theoreticalCapacity) * 100)) : 0;

    return {
      rate,
      totalEvents,
      theoreticalCapacity,
      workDays,
      agentCount,
    };
  }, [currentDate, interventions, tasks, users, selectedAgentId]);

  const monthInterventionsCount = interventions.filter((i) => {
    if (!i.scheduledDate) return false;
    const date = new Date(i.scheduledDate);
    if (!isSameMonth(date, currentDate)) return false;
    if (selectedAgentId !== 'ALL' && i.technicianId !== selectedAgentId) return false;
    return true;
  }).length;

  const monthTasksCount = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const date = new Date(t.dueDate);
    if (!isSameMonth(date, currentDate)) return false;
    if (selectedAgentId !== 'ALL' && t.assignedTo !== selectedAgentId) return false;
    return true;
  }).length;

  const selectedAgentName = selectedAgentId !== 'ALL' ? users.find((u) => u.id === selectedAgentId)?.name : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4 flex items-center gap-4 border-l-4 border-l-orange-500">
        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600">
          <Wrench className="w-6 h-6" />
        </div>
        <div>
          <p className="section-title">Interventions</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {monthInterventionsCount} <span className="text-sm font-normal text-[var(--text-secondary)]">ce mois</span>
          </p>
        </div>
      </Card>

      <Card className="p-4 flex items-center gap-4 border-l-4 border-l-indigo-500">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
          <Briefcase className="w-6 h-6" />
        </div>
        <div>
          <p className="section-title">Tâches / RdV</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {monthTasksCount} <span className="text-sm font-normal text-[var(--text-secondary)]">ce mois</span>
          </p>
        </div>
      </Card>

      <Card className="p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="section-title">Taux d'occupation</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">{occupationRate.rate}%</p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {occupationRate.totalEvents}/{occupationRate.theoreticalCapacity} créneaux
          </p>
        </div>
      </Card>

      <Card className="p-4 flex items-center gap-4 border-l-4 border-l-purple-500">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="section-title">{selectedAgentName ? 'Agent' : 'Agents'}</p>
          <p className="text-xl font-bold text-[var(--text-primary)]">
            {selectedAgentName || `${occupationRate.agentCount} actifs`}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">{occupationRate.workDays} jours ouvrés</p>
        </div>
      </Card>
    </div>
  );
};
