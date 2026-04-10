// Hook pour la validation des périodes comptables
// Sprint 2 - Task 5

import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  validatePeriodOperation, 
  getPeriodForDate, 
  managePeriodLock,
  getAccountingPeriods,
  getFiscalCalendar
} from '../services/accountingPeriodService';
import { useAuditTrail } from './useAuditTrail';
import type { AccountingPeriod, PeriodValidation, FiscalCalendar } from '../types/accounting';

export const useAccountingPeriod = () => {
  const { user } = useAuth();
  const { logPeriodAction } = useAuditTrail();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const tenantId = user?.tenantId || 'default';
  
  // Valider si une opération est autorisée pour une date
  const validateOperation = useCallback(async (
    date: string,
    operation: 'create' | 'edit' | 'delete'
  ): Promise<PeriodValidation> => {
    setError(null);
    try {
      return await validatePeriodOperation(tenantId, date, operation);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        reason: message,
      };
    }
  }, [tenantId]);
  
  // Obtenir la période pour une date
  const getPeriod = useCallback(async (date: string): Promise<AccountingPeriod | null> => {
    setError(null);
    try {
      return await getPeriodForDate(tenantId, date);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    }
  }, [tenantId]);
  
  // Obtenir toutes les périodes
  const getAllPeriods = useCallback(async (): Promise<AccountingPeriod[]> => {
    setLoading(true);
    setError(null);
    try {
      const periods = await getAccountingPeriods(tenantId);
      return periods;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return [];
    } finally {
      setLoading(false);
    }
  }, [tenantId]);
  
  // Obtenir le calendrier fiscal
  const getCalendar = useCallback(async (year?: number): Promise<FiscalCalendar | null> => {
    setLoading(true);
    setError(null);
    try {
      return await getFiscalCalendar(tenantId, year);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId]);
  
  // Clôturer une période
  const closePeriod = useCallback(async (
    periodId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' };
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await managePeriodLock(
        tenantId,
        { periodId, action: 'close', reason },
        user.id,
        user.name
      );
      
      if (result.success && result.period) {
        const periodName = `${getMonthName(result.period.month)} ${result.period.year}`;
        logPeriodAction('close', periodName, periodId, reason);
      }
      
      if (!result.success) {
        setError(result.error || 'Erreur inconnue');
      }
      
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, logPeriodAction]);
  
  // Verrouiller une période
  const lockPeriod = useCallback(async (
    periodId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' };
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await managePeriodLock(
        tenantId,
        { periodId, action: 'lock', reason },
        user.id,
        user.name
      );
      
      if (result.success && result.period) {
        const periodName = `${getMonthName(result.period.month)} ${result.period.year}`;
        logPeriodAction('lock', periodName, periodId, reason);
      }
      
      if (!result.success) {
        setError(result.error || 'Erreur inconnue');
      }
      
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, logPeriodAction]);
  
  // Rouvrir une période
  const reopenPeriod = useCallback(async (
    periodId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' };
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await managePeriodLock(
        tenantId,
        { periodId, action: 'reopen', reason },
        user.id,
        user.name
      );
      
      if (result.success && result.period) {
        const periodName = `${getMonthName(result.period.month)} ${result.period.year}`;
        logPeriodAction('reopen', periodName, periodId, reason);
      }
      
      if (!result.success) {
        setError(result.error || 'Erreur inconnue');
      }
      
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [tenantId, user, logPeriodAction]);
  
  // Vérifier avant soumission d'écriture
  const checkBeforeEntry = useCallback(async (
    entryDate: string
  ): Promise<{ allowed: boolean; message?: string }> => {
    const validation = await validateOperation(entryDate, 'create');
    
    if (!validation.canCreate) {
      return {
        allowed: false,
        message: validation.reason,
      };
    }
    
    return { allowed: true };
  }, [validateOperation]);
  
  return {
    loading,
    error,
    validateOperation,
    getPeriod,
    getAllPeriods,
    getCalendar,
    closePeriod,
    lockPeriod,
    reopenPeriod,
    checkBeforeEntry,
  };
};

// Helper
const getMonthName = (month: number): string => {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[month - 1] || '';
};
