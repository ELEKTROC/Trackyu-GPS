import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../../contexts/DataContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import {
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth
} from 'date-fns';
import {
    AgendaHeader,
    AgendaStats,
    AgendaCalendar,
    InterventionDetailModal
} from './partials';
import { InterventionForm } from '../../tech/components/InterventionForm';
import { TaskForm } from '../../crm/components/TaskForm';
import type { Intervention } from '../../../types';
import type { Task } from '../../../types/crm';

// Unified event type for calendar display
interface AgendaEvent {
    id: string;
    title: string;
    date: Date;
    type: 'TECH' | 'BUSINESS';
    status?: string;
    priority?: string;
    clientName?: string;
    agentName?: string;
    agentId?: string;
    location?: string;
    [key: string]: unknown;
}




export const AgendaView: React.FC = () => {
    const isMobile = useIsMobile();
    const { interventions, tasks, users, clients, addIntervention, updateIntervention, addTask, updateTask } = useDataContext();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filter, setFilter] = useState<'ALL' | 'TECH' | 'BUSINESS'>('ALL');
    const [selectedAgentId, setSelectedAgentId] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Map des clients pour lookup rapide
    const clientsMap = useMemo(() => {
        const map = new Map<string, string>();
        clients.forEach(c => map.set(c.id, c.name || c.companyName || c.email || c.id));
        return map;
    }, [clients]);

    // Modals state
    const [isInterventionDetailOpen, setIsInterventionDetailOpen] = useState(false);
    const [isInterventionFormOpen, setIsInterventionFormOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);

    // Liste des agents (techniciens + commerciaux)
    const agents = useMemo(() => {
        const agentMap = new Map<string, { id: string; name: string; role: string }>();
        users.forEach(u => {
            if (u.role === 'TECHNICIAN' || u.role === 'COMMERCIAL' || u.role === 'ADMIN') {
                agentMap.set(u.id, { id: u.id, name: u.name, role: u.role });
            }
        });
        return Array.from(agentMap.values());
    }, [users]);

    // Combine events for the calendar
    const allEvents = useMemo(() => {
        const events: any[] = [];

        // Add Interventions
        interventions.forEach(inter => {
            // Skip interventions without valid scheduledDate
            if (!inter.scheduledDate) return;
            const date = new Date(inter.scheduledDate);
            if (isNaN(date.getTime())) return;

            // Filtre par agent si sélectionné
            if (selectedAgentId !== 'ALL' && inter.technicianId !== selectedAgentId) return;
            
            const technician = users.find(u => u.id === inter.technicianId);
            const clientName = inter.clientId ? (clientsMap.get(inter.clientId) || inter.clientId) : 'Client';
            events.push({
                ...inter,
                title: `${inter.nature || inter.type} - ${inter.vehicleName || clientName}`,
                clientName,
                date,
                type: 'TECH' as const,
                agentName: technician?.name || 'Non assigné',
                agentId: inter.technicianId,
                location: inter.address || inter.location || ''
            });
        });

        // Add CRM Tasks
        tasks.forEach(task => {
            if (task.dueDate) {
                const date = new Date(task.dueDate);
                if (isNaN(date.getTime())) return;

                // Filtre par agent si sélectionné
                if (selectedAgentId !== 'ALL' && task.assignedTo !== selectedAgentId) return;
                
                const assignee = users.find(u => u.id === task.assignedTo);
                const taskClientName = task.relatedTo?.name || (task.clientId ? (clientsMap.get(task.clientId) || task.clientId) : '');
                events.push({
                    ...task,
                    date,
                    type: 'BUSINESS' as const,
                    clientName: taskClientName,
                    agentName: assignee?.name || 'Non assigné',
                    agentId: task.assignedTo,
                    location: taskClientName
                });
            }
        });

        return events;
    }, [interventions, tasks, users, selectedAgentId, clientsMap]);

    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return allEvents;
        const q = searchQuery.toLowerCase();
        return allEvents.filter(e =>
            e.title?.toLowerCase().includes(q) ||
            e.clientName?.toLowerCase().includes(q) ||
            e.agentName?.toLowerCase().includes(q) ||
            e.location?.toLowerCase().includes(q)
        );
    }, [allEvents, searchQuery]);

    // Handler pour déplacer un événement (Drag & Drop)
    const handleEventMove = async (event: any, newDate: Date) => {
        if (event.type === 'TECH') {
            // Mettre à jour l'intervention
            await updateIntervention({
                ...event,
                scheduledDate: newDate.toISOString()
            });
        } else {
            // Mettre à jour la tâche
            await updateTask({
                ...event,
                dueDate: newDate.toISOString()
            });
        }
    };

    // Calendar logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const handleEventClick = (event: AgendaEvent) => {
        setSelectedEvent(event);
        if (event.type === 'TECH') {
            // Ouvrir en mode lecture seule
            setIsInterventionDetailOpen(true);
        } else {
            setIsTaskModalOpen(true);
        }
    };

    const handleEditIntervention = () => {
        // Fermer le detail et ouvrir le formulaire d'édition
        setIsInterventionDetailOpen(false);
        setIsInterventionFormOpen(true);
    };

    const handleNewEvent = (type: 'TECH' | 'BUSINESS' | 'TASK') => {
        setSelectedEvent(null);
        if (type === 'TECH') {
            // Pour une nouvelle intervention, ouvrir directement le formulaire
            setIsInterventionFormOpen(true);
        } else {
            // BUSINESS ou TASK ouvrent le formulaire de tâche
            setIsTaskModalOpen(true);
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 pb-12">
            <AgendaHeader
                filter={filter}
                setFilter={setFilter}
                onNewEvent={handleNewEvent}
                agents={agents}
                selectedAgentId={selectedAgentId}
                setSelectedAgentId={setSelectedAgentId}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

            <AgendaCalendar
                currentDate={currentDate}
                prevMonth={prevMonth}
                nextMonth={nextMonth}
                setCurrentDate={setCurrentDate}
                calendarDays={calendarDays}
                monthStart={monthStart}
                allEvents={filteredEvents}
                filter={filter}
                onEventClick={handleEventClick}
                onEventMove={handleEventMove}
            />

            {!isMobile && (
            <AgendaStats
                currentDate={currentDate}
                interventions={interventions}
                tasks={tasks}
                users={users}
                selectedAgentId={selectedAgentId}
            />
            )}

            {/* Modals */}
            
            {/* Modal de détail intervention (lecture seule) */}
            <InterventionDetailModal
                isOpen={isInterventionDetailOpen}
                onClose={() => {
                    setIsInterventionDetailOpen(false);
                    setSelectedEvent(null);
                }}
                onEdit={handleEditIntervention}
                onStatusChange={(int, newStatus) => {
                    const updated = { ...int, status: newStatus, enRouteTime: newStatus === 'EN_ROUTE' ? new Date().toISOString() : int.enRouteTime };
                    updateIntervention(updated);
                    setSelectedEvent(updated);
                }}
                intervention={selectedEvent?.type === 'TECH' ? selectedEvent : null}
                clients={clients}
            />

            {/* Formulaire d'édition intervention */}
            <InterventionForm
                isOpen={isInterventionFormOpen}
                onClose={() => {
                    setIsInterventionFormOpen(false);
                    setSelectedEvent(null);
                }}
                onSave={(data) => {
                    if (selectedEvent) {
                        updateIntervention(data as Intervention);
                    } else {
                        addIntervention(data as Intervention);
                    }
                }}
                initialData={selectedEvent?.type === 'TECH' ? selectedEvent as unknown as Intervention : null}
                technicians={users.filter(u => u.role === 'TECHNICIAN')}
            />

            <TaskForm
                isOpen={isTaskModalOpen}
                onClose={() => {
                    setIsTaskModalOpen(false);
                    setSelectedEvent(null);
                }}
                task={selectedEvent?.type === 'BUSINESS' ? selectedEvent as unknown as Task : undefined}
            />
        </div>
    );
};
