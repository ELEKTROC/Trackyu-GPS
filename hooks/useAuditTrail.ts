import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

type PeriodActionType = 'close' | 'lock' | 'reopen';

export const useAuditTrail = () => {
  const { user } = useAuth();

  const logPeriodAction = useCallback(
    (action: PeriodActionType, periodName: string, periodId: string, reason?: string) => {
      logger.log('[AuditTrail] Period action', {
        action,
        periodName,
        periodId,
        reason,
        userId: user?.id,
        userName: user?.name,
        timestamp: new Date().toISOString(),
      });
    },
    [user]
  );

  return { logPeriodAction };
};
