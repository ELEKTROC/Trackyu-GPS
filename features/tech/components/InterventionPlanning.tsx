import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  User,
  Users,
  Clock,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';
import { Card } from '../../../components/Card';
import type { Intervention, User as UserType } from '../../../types';
import { getStatusBgClass } from '../../../constants';
import { useDataContext } from '../../../contexts/DataContext';
import { useIsMobile } from '../../../hooks/useIsMobile';

interface InterventionPlanningProps {
  interventions: Intervention[];
  technicians: UserType[];
  currentUserId?: string;
  onEdit: (intervention: Intervention) => void;
  onUpdate?: (intervention: Intervention) => void;
}

// --- CONSTANTES HORAIRES ---
const DAY_START = 8; // 08h
const DAY_END = 18; // 18h
const TOTAL_HOURS = DAY_END - DAY_START; // 10 plages
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => DAY_START + i); // [8..18]

export const InterventionPlanning: React.FC<InterventionPlanningProps> = ({
  interventions,
  technicians,
  currentUserId,
  onEdit,
  onUpdate,
}) => {
  const { tiers } = useDataContext();
  const isMobile = useIsMobile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [showMyPlanningOnly, setShowMyPlanningOnly] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  // Helper pour obtenir le nom du client
  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return 'Client';
    const client = tiers.find((t) => t.id === clientId);
    return client?.name || clientId;
  };

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(currentDate);
    if (viewMode === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
      }
    } else {
      dates.push(new Date(currentDate));
    }
    return dates;
  }, [currentDate, viewMode]);

  const filteredTechnicians = useMemo(() => {
    let techs = technicians.filter((t) => t.id !== 'unassigned');
    if (showMyPlanningOnly && currentUserId) {
      techs = techs.filter((t) => t.id === currentUserId);
    }
    return techs;
  }, [technicians, showMyPlanningOnly, currentUserId]);

  // --- Interventions planifiées (avec date + technicien) ---
  const getInterventionsForTechAndDate = useCallback(
    (techId: string, date: Date) => {
      return interventions.filter((i) => {
        if (!i.technicianId || i.technicianId === 'unassigned' || i.technicianId === 'UNASSIGNED') return false;
        if (i.technicianId !== techId) return false;
        if (!i.scheduledDate) return false;
        const iDate = new Date(i.scheduledDate);
        if (isNaN(iDate.getTime())) return false;
        return (
          iDate.getDate() === date.getDate() &&
          iDate.getMonth() === date.getMonth() &&
          iDate.getFullYear() === date.getFullYear()
        );
      });
    },
    [interventions]
  );

  // --- Interventions À PLANIFIER (pool en bas) ---
  const unplannedInterventions = useMemo(() => {
    return interventions.filter((i) => {
      // Pas de date planifiée OU pas de technicien assigné OU status PENDING sans heure
      const noTech = !i.technicianId || i.technicianId === 'unassigned' || i.technicianId === 'UNASSIGNED';
      const noDate = !i.scheduledDate;
      const isPending = i.status === 'PENDING';
      const isCancelled = i.status === 'CANCELLED';
      const isCompleted = i.status === 'COMPLETED';
      if (isCancelled || isCompleted) return false;
      return noTech || noDate || (isPending && noTech);
    });
  }, [interventions]);

  // --- Calcul position/taille d'une intervention sur la grille horaire ---
  const getTimePosition = (intervention: Intervention) => {
    if (!intervention.scheduledDate) return null;
    const d = new Date(intervention.scheduledDate);
    const hours = d.getHours() + d.getMinutes() / 60;
    const clampedStart = Math.max(hours, DAY_START);
    const durationH = Math.max((intervention.duration || 60) / 60, 0.5); // Min 30min affichage
    const left = ((clampedStart - DAY_START) / TOTAL_HOURS) * 100;
    const width = Math.min((durationH / TOTAL_HOURS) * 100, 100 - left);
    return { left: `${left}%`, width: `${Math.max(width, 4)}%` }; // Min 4% width pour visibilité
  };

  // --- Détection de conflits (chevauchements) ---
  const hasConflict = useCallback(
    (intervention: Intervention, techId: string, date: Date) => {
      if (!intervention.scheduledDate) return false;
      const d = new Date(intervention.scheduledDate);
      const startMin = d.getHours() * 60 + d.getMinutes();
      const endMin = startMin + (intervention.duration || 60);

      const others = getInterventionsForTechAndDate(techId, date).filter((i) => i.id !== intervention.id);
      return others.some((other) => {
        if (!other.scheduledDate) return false;
        const od = new Date(other.scheduledDate);
        const oStart = od.getHours() * 60 + od.getMinutes();
        const oEnd = oStart + (other.duration || 60);
        return startMin < oEnd && endMin > oStart;
      });
    },
    [getInterventionsForTechAndDate]
  );

  // --- DRAG AND DROP ---
  const handleDragStart = (e: React.DragEvent, intervention: Intervention) => {
    e.dataTransfer.setData('interventionId', intervention.id);
    e.dataTransfer.effectAllowed = 'move';
    // Fantôme semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 50, 15);
    }
  };

  const handleDragOver = (e: React.DragEvent, slotKey?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (slotKey) setDragOverSlot(slotKey);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  // Drop sur la grille horaire (vue Jour)
  const handleDropOnTimeline = (e: React.DragEvent, techId: string, date: Date) => {
    e.preventDefault();
    setDragOverSlot(null);
    const interventionId = e.dataTransfer.getData('interventionId');
    const intervention = interventions.find((i) => i.id === interventionId);
    if (!intervention || !onUpdate) return;

    // Calculer l'heure à partir de la position X dans la cellule
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const rawHour = DAY_START + percentage * TOTAL_HOURS;
    // Snap à 30 min
    const snappedHour = Math.round(rawHour * 2) / 2;
    const clampedHour = Math.max(DAY_START, Math.min(DAY_END - 0.5, snappedHour));

    const newDate = new Date(date);
    newDate.setHours(Math.floor(clampedHour));
    newDate.setMinutes((clampedHour % 1) * 60);
    newDate.setSeconds(0);

    const updated: Intervention = {
      ...intervention,
      technicianId: techId === 'unassigned' ? intervention.technicianId : techId,
      scheduledDate: newDate.toISOString(),
      status: intervention.status === 'PENDING' ? 'SCHEDULED' : intervention.status,
    };
    onUpdate(updated);
  };

  // Drop sur une cellule en vue Semaine
  const handleDropOnWeekCell = (e: React.DragEvent, techId: string, date: Date) => {
    e.preventDefault();
    setDragOverSlot(null);
    const interventionId = e.dataTransfer.getData('interventionId');
    const intervention = interventions.find((i) => i.id === interventionId);
    if (!intervention || !onUpdate) return;

    // En vue semaine, on garde l'heure existante ou on met 09h par défaut
    const existingDate = intervention.scheduledDate ? new Date(intervention.scheduledDate) : null;
    const newDate = new Date(date);
    newDate.setHours(existingDate ? existingDate.getHours() : 9);
    newDate.setMinutes(existingDate ? existingDate.getMinutes() : 0);
    newDate.setSeconds(0);

    const updated: Intervention = {
      ...intervention,
      technicianId: techId === 'unassigned' ? intervention.technicianId : techId,
      scheduledDate: newDate.toISOString(),
      status: intervention.status === 'PENDING' ? 'SCHEDULED' : intervention.status,
    };
    onUpdate(updated);
  };

  // --- Navigation ---
  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  // --- Compteur interventions par tech pour la journée/semaine ---
  const getTechCount = (techId: string) => {
    let count = 0;
    for (const date of weekDates) {
      count += getInterventionsForTechAndDate(techId, date).length;
    }
    return count;
  };

  // ============================
  // RENDER
  // ============================

  // --- Carte d'intervention (réutilisée dans les 2 vues + pool) ---
  const renderInterventionCard = (int: Intervention, compact = false) => {
    const bgClass = getStatusBgClass(int.status);
    const time = int.scheduledDate
      ? new Date(int.scheduledDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '';
    const clientName = getClientName(int.clientId);
    const durationText = int.duration ? `${int.duration}min` : '';

    if (compact) {
      return (
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-bold truncate">{clientName}</span>
          {time && <span className="text-[9px] font-mono opacity-70 shrink-0">{time}</span>}
        </div>
      );
    }

    return (
      <>
        <div className="flex items-center justify-between gap-1 min-w-0">
          <span className="font-bold truncate flex-1">{clientName}</span>
          {time && <span className="text-[10px] font-mono opacity-80 shrink-0">{time}</span>}
        </div>
        <div className="truncate opacity-80 text-[11px]">{int.nature || int.type}</div>
        <div className="flex items-center gap-1 mt-0.5">
          {int.licensePlate && (
            <span className="font-mono text-[10px] bg-white/30 dark:bg-black/20 px-1 rounded truncate">
              {int.licensePlate}
            </span>
          )}
          {durationText && <span className="text-[9px] opacity-60 shrink-0">{durationText}</span>}
        </div>
      </>
    );
  };

  // ============================
  // MOBILE: Vue liste (remplace le Gantt)
  // ============================
  if (isMobile) {
    const dayGroups = filteredTechnicians
      .map((tech) => ({ tech, ints: getInterventionsForTechAndDate(tech.id, currentDate) }))
      .filter((g) => g.ints.length > 0);

    return (
      <Card className="flex-1 overflow-hidden flex flex-col p-0 border-[var(--border)]">
        {/* Toolbar mobile */}
        <div className="p-3 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="p-2 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)]"
            >
              Aujourd'hui
            </button>
            <button
              onClick={goNext}
              className="p-2 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex-1 text-center">
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {currentDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              {isToday(currentDate) && (
                <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[var(--primary)] text-white rounded-full font-bold">
                  Auj.
                </span>
              )}
            </div>
            <button
              onClick={() => setShowMyPlanningOnly(!showMyPlanningOnly)}
              className={`p-2 rounded-lg border transition-colors ${showMyPlanningOnly ? 'bg-[var(--primary-dim)] border-[var(--border)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)]'}`}
            >
              {showMyPlanningOnly ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {dayGroups.length === 0 && unplannedInterventions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)] p-8">
              <CalendarIcon className="w-10 h-10 opacity-30" />
              <p className="text-sm">Aucune intervention ce jour</p>
            </div>
          )}

          {dayGroups.map(({ tech, ints }) => (
            <div key={tech.id}>
              <div className="px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs font-bold text-[var(--text-secondary)]">{tech.name}</span>
                <span className="ml-auto text-xs text-[var(--text-muted)]">
                  {ints.length} intervention{ints.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-[var(--border)] dark:divide-slate-800">
                {[...ints]
                  .sort((a, b) => new Date(a.scheduledDate || 0).getTime() - new Date(b.scheduledDate || 0).getTime())
                  .map((int) => {
                    const time = int.scheduledDate
                      ? new Date(int.scheduledDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    const conflict = hasConflict(int, tech.id, currentDate);
                    return (
                      <div
                        key={int.id}
                        onClick={() => onEdit(int)}
                        className="flex items-stretch cursor-pointer tr-hover/50 active:bg-[var(--bg-elevated)] dark:active:bg-slate-700"
                      >
                        <div className={`w-1 shrink-0 ${getStatusBgClass(int.status)}`} />
                        <div className="flex-1 px-3 py-3 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono font-bold text-[var(--text-secondary)]">{time}</span>
                            {int.duration && (
                              <span className="text-[10px] text-[var(--text-muted)]">{int.duration}min</span>
                            )}
                            {conflict && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                          </div>
                          <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                            {getClientName(int.clientId)}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] truncate">{int.nature || int.type}</div>
                          {int.licensePlate && (
                            <div className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
                              {int.licensePlate}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center pr-3">
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] dark:text-[var(--text-secondary)]" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          {/* Pool à planifier */}
          {unplannedInterventions.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-t border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  À planifier ({unplannedInterventions.length})
                </span>
              </div>
              <div className="divide-y divide-[var(--border)] dark:divide-slate-800">
                {unplannedInterventions.map((int) => (
                  <div
                    key={int.id}
                    onClick={() => onEdit(int)}
                    className="flex items-stretch cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-900/10 active:bg-amber-50"
                  >
                    <div className="w-1 shrink-0 bg-amber-300 dark:bg-amber-700" />
                    <div className="flex-1 px-3 py-3 min-w-0">
                      <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {getClientName(int.clientId)}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate">{int.nature || int.type}</div>
                      {int.licensePlate && (
                        <div className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">{int.licensePlate}</div>
                      )}
                    </div>
                    <div className="flex items-center pr-3">
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] dark:text-[var(--text-secondary)]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex-1 overflow-hidden flex flex-col p-0 border-[var(--border)]">
      {/* ======== TOOLBAR ======== */}
      <div className="p-3 border-b border-[var(--border)] flex flex-wrap justify-between items-center gap-2 bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-3">
          {/* Vue Jour / Semaine */}
          <div className="flex items-center bg-[var(--bg-surface)] rounded-lg border border-[var(--border)] p-0.5">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]'}`}
            >
              Jour
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] dark:text-[var(--text-muted)]'}`}
            >
              Semaine
            </button>
          </div>

          {/* Navigation date */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={goPrev}
              className="p-1 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="px-2 py-1 text-xs font-medium rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 transition-colors"
            >
              Aujourd'hui
            </button>
            <button
              onClick={goNext}
              className="p-1 hover:bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] rounded"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Label date */}
          <span className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm">
            <CalendarIcon className="w-4 h-4 text-[var(--text-muted)]" />
            {viewMode === 'week'
              ? `Semaine du ${weekDates[0]?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
              : currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Compteur non planifiées */}
          {unplannedInterventions.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md">
              <Clock className="w-3 h-3" />
              {unplannedInterventions.length} à planifier
            </span>
          )}

          {/* Mon planning / Tous */}
          <button
            onClick={() => setShowMyPlanningOnly(!showMyPlanningOnly)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${showMyPlanningOnly ? 'bg-[var(--primary-dim)] border-[var(--border)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:border-[var(--primary)] dark:text-[var(--primary)]' : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'}`}
          >
            {showMyPlanningOnly ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            {showMyPlanningOnly ? 'Mon Planning' : 'Tous'}
          </button>
        </div>
      </div>

      {/* ======== GRILLE PLANNING ======== */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-[var(--bg-surface)] pb-16 lg:pb-0">
        {viewMode === 'day' ? (
          /* ======================== VUE JOUR : Plages horaires 08h→18h ======================== */
          <div className="min-w-[900px]">
            {/* En-tête heures */}
            <div className="flex border-b border-[var(--border)] sticky top-0 bg-[var(--bg-surface)] z-10">
              <div className="w-36 shrink-0 p-2 font-bold text-[var(--text-secondary)] text-xs border-r border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-1">
                <User className="w-3 h-3" /> Technicien
              </div>
              <div className="flex-1 flex">
                {HOURS.slice(0, -1).map((hour) => (
                  <div
                    key={hour}
                    className={`flex-1 text-center py-2 border-r border-[var(--border)] text-[11px] font-semibold ${hour === new Date().getHours() && isToday(currentDate) ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}
                  >
                    {String(hour).padStart(2, '0')}h
                  </div>
                ))}
              </div>
            </div>

            {/* Lignes techniciens */}
            <div className="divide-y divide-[var(--border)]">
              {filteredTechnicians.map((tech) => {
                const dayInts = getInterventionsForTechAndDate(tech.id, currentDate);
                const techCount = dayInts.length;

                return (
                  <div key={tech.id} className="flex" style={{ minHeight: '72px' }}>
                    {/* Nom technicien */}
                    <div className="w-36 shrink-0 p-2 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col justify-center">
                      <div className="font-bold text-xs text-[var(--text-primary)] truncate">{tech.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {techCount > 0 ? `${techCount} intervention${techCount > 1 ? 's' : ''}` : 'Disponible'}
                      </div>
                    </div>

                    {/* Timeline 08h → 18h */}
                    <div
                      className={`flex-1 relative transition-colors ${dragOverSlot === `day-${tech.id}` ? 'bg-[var(--primary-dim)]/50 dark:bg-[var(--primary-dim)]' : ''}`}
                      onDragOver={(e) => handleDragOver(e, `day-${tech.id}`)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropOnTimeline(e, tech.id, currentDate)}
                    >
                      {/* Lignes verticales des heures */}
                      {HOURS.map((hour, i) => (
                        <div
                          key={hour}
                          className={`absolute top-0 bottom-0 border-l ${i === 0 ? 'border-transparent' : hour === 12 ? 'border-[var(--border)]' : 'border-[var(--border)] border-[var(--border)]'}`}
                          style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
                        />
                      ))}

                      {/* Ligne "maintenant" */}
                      {isToday(currentDate) &&
                        (() => {
                          const now = new Date();
                          const nowH = now.getHours() + now.getMinutes() / 60;
                          if (nowH >= DAY_START && nowH <= DAY_END) {
                            const pos = ((nowH - DAY_START) / TOTAL_HOURS) * 100;
                            return (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                                style={{ left: `${pos}%` }}
                              >
                                <div className="w-2 h-2 rounded-full bg-red-500 -translate-x-[3px] -translate-y-0.5" />
                              </div>
                            );
                          }
                          return null;
                        })()}

                      {/* Cartes intervention positionnées par heure */}
                      {dayInts.map((int) => {
                        const pos = getTimePosition(int);
                        if (!pos) return null;
                        const bgClass = getStatusBgClass(int.status);
                        const conflict = hasConflict(int, tech.id, currentDate);
                        return (
                          <div
                            key={int.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, int)}
                            onClick={() => onEdit(int)}
                            className={`absolute top-1 bottom-1 rounded-md px-1.5 py-1 text-[11px] border-2 shadow-sm cursor-pointer hover:shadow-md hover:z-30 transition-all overflow-hidden z-10 ${bgClass} ${conflict ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
                            style={{ left: pos.left, width: pos.width }}
                            title={`${new Date(int.scheduledDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${int.nature || int.type} - ${getClientName(int.clientId)}${conflict ? ' ⚠️ Conflit horaire' : ''}`}
                          >
                            {conflict && <AlertTriangle className="w-3 h-3 text-red-500 absolute top-0.5 right-0.5" />}
                            {renderInterventionCard(int, false)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ======================== VUE SEMAINE : Grille classique améliorée ======================== */
          <div className="min-w-[1000px]">
            {/* En-tête dates */}
            <div className="flex border-b border-[var(--border)] sticky top-0 bg-[var(--bg-surface)] z-10">
              <div className="w-36 shrink-0 p-2 font-bold text-[var(--text-secondary)] text-xs border-r border-[var(--border)] bg-[var(--bg-elevated)] flex items-center gap-1">
                <User className="w-3 h-3" /> Technicien
              </div>
              {weekDates.map((date) => (
                <div
                  key={date.toISOString()}
                  className={`flex-1 p-2 text-center border-r border-[var(--border)] ${isToday(date) ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]' : ''}`}
                >
                  <div
                    className={`text-xs font-bold ${isToday(date) ? 'text-[var(--primary)] dark:text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}
                  >
                    {date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </div>
                  <div
                    className={`text-sm font-bold ${isToday(date) ? 'bg-[var(--primary)] text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto' : 'text-[var(--text-secondary)]'}`}
                  >
                    {date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Grille */}
            <div className="divide-y divide-[var(--border)]">
              {filteredTechnicians.map((tech) => {
                const weekCount = getTechCount(tech.id);
                return (
                  <div key={tech.id} className="flex min-h-[100px]">
                    <div className="w-36 shrink-0 p-2 border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col justify-center">
                      <div className="font-bold text-xs text-[var(--text-primary)] truncate">{tech.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {weekCount} intervention{weekCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {weekDates.map((date) => {
                      const dayInts = getInterventionsForTechAndDate(tech.id, date);
                      const slotKey = `week-${tech.id}-${date.toISOString()}`;
                      return (
                        <div
                          key={date.toISOString()}
                          className={`flex-1 border-r border-[var(--border)] p-1 flex flex-col gap-0.5 transition-colors ${dragOverSlot === slotKey ? 'bg-[var(--primary-dim)]/60 dark:bg-[var(--primary-dim)]' : isToday(date) ? 'bg-[var(--primary-dim)]/30 dark:bg-[var(--primary-dim)]' : 'tr-hover/50'}`}
                          onDragOver={(e) => handleDragOver(e, slotKey)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDropOnWeekCell(e, tech.id, date)}
                        >
                          {dayInts.map((int) => {
                            const bgClass = getStatusBgClass(int.status);
                            const time = int.scheduledDate
                              ? new Date(int.scheduledDate).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '';
                            const clientName = getClientName(int.clientId);
                            return (
                              <div
                                key={int.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, int)}
                                onClick={() => onEdit(int)}
                                className={`rounded-md px-1.5 py-1 text-[11px] border shadow-sm cursor-pointer hover:shadow-md transition-all ${bgClass}`}
                                title={`${time} - ${int.nature || int.type} - ${clientName}`}
                              >
                                <div className="flex items-center gap-1 min-w-0">
                                  {time && <span className="text-[9px] font-mono opacity-70 shrink-0">{time}</span>}
                                  <span className="font-bold truncate text-[10px]">{clientName}</span>
                                </div>
                                <div className="truncate opacity-75 text-[10px]">{int.nature || int.type}</div>
                              </div>
                            );
                          })}
                          {dayInts.length === 0 && (
                            <div className="flex-1 flex items-center justify-center text-[10px] text-[var(--text-muted)] dark:text-[var(--text-secondary)] select-none">
                              —
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ======== POOL : INTERVENTIONS À PLANIFIER (drag & drop) ======== */}
      {unplannedInterventions.length > 0 && (
        <div className="border-t-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
          <div className="px-3 py-2 flex items-center justify-between border-b border-amber-200/60 dark:border-amber-800/40">
            <span className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Clock className="w-3.5 h-3.5" />À planifier ({unplannedInterventions.length})
            </span>
            <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
              Glissez vers le calendrier pour planifier
            </span>
          </div>
          <div className="p-2 flex flex-wrap gap-2 max-h-[160px] overflow-auto custom-scrollbar">
            {unplannedInterventions.map((int) => {
              const bgClass = getStatusBgClass(int.status);
              const clientName = getClientName(int.clientId);
              const techName = (() => {
                if (!int.technicianId || int.technicianId === 'unassigned' || int.technicianId === 'UNASSIGNED')
                  return null;
                const t = technicians.find((t) => t.id === int.technicianId);
                return t?.name;
              })();
              return (
                <div
                  key={int.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, int)}
                  onClick={() => onEdit(int)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs border-2 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${bgClass}`}
                  title={`${int.nature || int.type} - ${clientName}`}
                >
                  <GripVertical className="w-3 h-3 opacity-40 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold truncate max-w-[140px]">{clientName}</div>
                    <div className="truncate opacity-75 text-[10px]">{int.nature || int.type}</div>
                    {techName && <div className="text-[9px] opacity-60 truncate">{techName}</div>}
                    {int.licensePlate && <div className="font-mono text-[9px] opacity-60">{int.licensePlate}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
