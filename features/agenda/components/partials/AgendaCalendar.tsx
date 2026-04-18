import React, { useState } from 'react';
import { Card } from '../../../../components/Card';
import { ChevronLeft, ChevronRight, Wrench, Briefcase, User, MapPin, Clock, GripVertical } from 'lucide-react';
import { format, isSameMonth, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from '../../../../i18n';

interface AgendaCalendarProps {
  currentDate: Date;
  prevMonth: () => void;
  nextMonth: () => void;
  setCurrentDate: (date: Date) => void;
  calendarDays: Date[];
  monthStart: Date;
  allEvents: any[];
  filter: 'ALL' | 'TECH' | 'BUSINESS';
  onEventClick: (event: any) => void;
  onEventMove?: (event: any, newDate: Date) => void;
}

export const AgendaCalendar: React.FC<AgendaCalendarProps> = ({
  currentDate,
  prevMonth,
  nextMonth,
  setCurrentDate,
  calendarDays,
  monthStart,
  allEvents,
  filter,
  onEventClick,
  onEventMove,
}) => {
  const { t } = useTranslation();
  const [hoveredEvent, setHoveredEvent] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [draggedEvent, setDraggedEvent] = useState<any>(null);
  const [dragOverDay, setDragOverDay] = useState<Date | null>(null);

  const handleMouseEnter = (event: any, e: React.MouseEvent) => {
    if (draggedEvent) return; // Pas de tooltip pendant le drag
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setHoveredEvent(event);
  };

  const handleMouseLeave = () => {
    setHoveredEvent(null);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, event: any) => {
    setDraggedEvent(event);
    setHoveredEvent(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', event.id);
  };

  const handleDragEnd = () => {
    setDraggedEvent(null);
    setDragOverDay(null);
  };

  const handleDragOver = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
  };

  const handleDragLeave = () => {
    setDragOverDay(null);
  };

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    setDragOverDay(null);

    if (draggedEvent && onEventMove && !isSameDay(draggedEvent.date, day)) {
      // Conserver l'heure originale mais changer le jour
      const newDate = new Date(day);
      const originalDate = new Date(draggedEvent.date);
      newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
      onEventMove(draggedEvent, newDate);
    }

    setDraggedEvent(null);
  };

  // Formater l'heure
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm');
  };

  return (
    <Card className="p-4 relative">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[var(--text-primary)] capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] rounded-lg"
          >
            {t('agenda.calendar.today')}
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-t border-l border-[var(--border)]">
        {[
          [t('agenda.calendar.days.monShort'), t('agenda.calendar.days.monFull')],
          [t('agenda.calendar.days.tueShort'), t('agenda.calendar.days.tueFull')],
          [t('agenda.calendar.days.wedShort'), t('agenda.calendar.days.wedFull')],
          [t('agenda.calendar.days.thuShort'), t('agenda.calendar.days.thuFull')],
          [t('agenda.calendar.days.friShort'), t('agenda.calendar.days.friFull')],
          [t('agenda.calendar.days.satShort'), t('agenda.calendar.days.satFull')],
          [t('agenda.calendar.days.sunShort'), t('agenda.calendar.days.sunFull')],
        ].map(([short, full]) => (
          <div
            key={full}
            className="py-2 text-center section-title bg-[var(--bg-elevated)] border-r border-b border-[var(--border)]"
          >
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{full}</span>
          </div>
        ))}

        {calendarDays.map((day, idx) => {
          const dayEvents = allEvents
            .filter((e) => isSameDay(e.date, day))
            .filter((e) => filter === 'ALL' || e.type === filter)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const isDragOver = dragOverDay && isSameDay(dragOverDay, day);

          return (
            <div
              key={idx}
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={`min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 border-r border-b border-[var(--border)] transition-all ${
                !isSameMonth(day, monthStart)
                  ? 'bg-[var(--bg-elevated)]/50 bg-[var(--bg-surface)]/20'
                  : 'bg-[var(--bg-surface)]/40'
              } ${isSameDay(day, new Date()) ? 'ring-2 ring-inset ring-[var(--primary)] ring-opacity-50' : ''} ${
                isDragOver
                  ? 'bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] ring-2 ring-[var(--primary-dim)]'
                  : ''
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span
                  className={`text-xs font-bold ${
                    isSameDay(day, new Date())
                      ? 'w-6 h-6 flex items-center justify-center bg-[var(--primary)] text-white rounded-full'
                      : !isSameMonth(day, monthStart)
                        ? 'text-[var(--text-muted)]'
                        : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] font-bold text-[var(--primary)] dark:text-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] rounded px-0.5">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Container scrollable pour les événements */}
              <div className="space-y-0.5 sm:space-y-1 max-h-[56px] sm:max-h-[90px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    draggable={!!onEventMove}
                    onDragStart={(e) => handleDragStart(e, event)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onEventClick(event)}
                    onMouseEnter={(e) => handleMouseEnter(event, e)}
                    onMouseLeave={handleMouseLeave}
                    className={`px-1 sm:px-1.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-medium border truncate flex items-center gap-0.5 sm:gap-1 cursor-pointer sm:cursor-grab active:cursor-grabbing hover:brightness-95 transition-all ${
                      event.type === 'TECH'
                        ? 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800'
                    } ${draggedEvent?.id === event.id ? 'opacity-50' : ''}`}
                  >
                    <GripVertical className="hidden sm:block w-2 h-2 flex-shrink-0 opacity-50" />
                    {event.type === 'TECH' ? (
                      <Wrench className="w-2.5 h-2.5 flex-shrink-0" />
                    ) : (
                      <Briefcase className="w-2.5 h-2.5 flex-shrink-0" />
                    )}
                    <span className="hidden sm:inline text-[9px] font-bold flex-shrink-0">
                      {formatTime(event.date)}
                    </span>
                    <span className="truncate">{event.clientName || event.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip avec détails */}
      {hoveredEvent && !draggedEvent && (
        <div
          className="fixed z-50 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl p-3 min-w-[240px] max-w-[320px] pointer-events-none"
          style={{
            left: Math.min(tooltipPosition.x - 120, window.innerWidth - 340),
            top: Math.max(tooltipPosition.y - 150, 10),
            transform: 'translateX(0)',
          }}
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              {hoveredEvent.type === 'TECH' ? (
                <Wrench className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Briefcase className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{hoveredEvent.title}</p>
                {hoveredEvent.clientName && hoveredEvent.clientName !== hoveredEvent.title && (
                  <p className="text-xs text-[var(--primary)] dark:text-[var(--primary)] font-medium truncate">
                    {t('agenda.tooltip.clientLabel')}: {hoveredEvent.clientName}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-[var(--border)] border-[var(--border)] pt-2 space-y-1.5">
              {/* Date et Heure */}
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">
                  {format(hoveredEvent.date, 'EEEE d MMMM', { locale: fr })} à {formatTime(hoveredEvent.date)}
                </span>
              </div>

              {/* Agent */}
              <div className="flex items-center gap-2 text-xs">
                <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[var(--text-secondary)]">
                  {hoveredEvent.agentName || t('agenda.tooltip.notAssigned')}
                </span>
              </div>

              {/* Localisation */}
              {hoveredEvent.location && (
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-secondary)] truncate">{hoveredEvent.location}</span>
                </div>
              )}

              {/* Statut */}
              {hoveredEvent.status && (
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      hoveredEvent.status === 'DONE' || hoveredEvent.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : hoveredEvent.status === 'IN_PROGRESS'
                          ? 'bg-[var(--primary-dim)] text-[var(--primary)] dark:bg-[var(--primary-dim)] dark:text-[var(--primary)]'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {hoveredEvent.status === 'TODO'
                      ? t('agenda.status.todo')
                      : hoveredEvent.status === 'IN_PROGRESS'
                        ? t('agenda.status.inProgress')
                        : hoveredEvent.status === 'DONE'
                          ? t('agenda.status.done')
                          : hoveredEvent.status === 'COMPLETED'
                            ? t('agenda.status.done')
                            : hoveredEvent.status === 'SCHEDULED'
                              ? t('agenda.status.scheduled')
                              : hoveredEvent.status}
                  </span>
                </div>
              )}
            </div>

            {/* Indication drag & drop */}
            {onEventMove && (
              <p className="text-[9px] text-[var(--text-muted)] italic pt-1 border-t border-[var(--border)] border-[var(--border)]">
                {t('agenda.tooltip.dragHint')}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
