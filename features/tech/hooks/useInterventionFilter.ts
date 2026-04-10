import { useState, useMemo } from 'react';
import type { Intervention } from '../../../types';

export const useInterventionFilter = (interventions: Intervention[], dateRange?: { start: string; end: string }) => {
    const [filterTech, setFilterTech] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');

    const filteredInterventions = useMemo(() => {
        return interventions.filter(i => {
            const matchTech = filterTech === 'ALL' || i.technicianId === filterTech;
            const matchStatus = filterStatus === 'ALL' || i.status === filterStatus;
            const matchType = filterType === 'ALL' || i.type === filterType;
            
            let matchDate = true;
            if (dateRange) {
                if (!i.scheduledDate) return false;
                const date = new Date(i.scheduledDate).toISOString().split('T')[0];
                matchDate = date >= dateRange.start && date <= dateRange.end;
            }

            return matchTech && matchStatus && matchType && matchDate;
        }).sort((a, b) => new Date(b.scheduledDate || 0).getTime() - new Date(a.scheduledDate || 0).getTime());
    }, [interventions, filterTech, filterStatus, filterType, dateRange]);

    return {
        filterTech, setFilterTech,
        filterStatus, setFilterStatus,
        filterType, setFilterType,
        filteredInterventions
    };
};
