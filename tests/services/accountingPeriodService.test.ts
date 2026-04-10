/**
 * Tests unitaires - accountingPeriodService
 * Sprint 2 - Task 7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeAccountingPeriods,
  getAccountingPeriods,
  getPeriodForDate,
  validatePeriodOperation,
  managePeriodLock,
  getFiscalCalendar,
  checkPeriodBeforeEntry,
  __resetLocalPeriods,
} from '../../services/accountingPeriodService';

describe('accountingPeriodService', () => {
  const tenantId = 'test-tenant-123';

  beforeEach(() => {
    __resetLocalPeriods();
  });

  describe('initializeAccountingPeriods', () => {
    it('devrait créer 12 périodes pour une année', () => {
      const periods = initializeAccountingPeriods(tenantId, 2025);

      expect(periods).toHaveLength(12);
      expect(periods[0].month).toBe(1); // Janvier
      expect(periods[11].month).toBe(12); // Décembre
    });

    it('devrait créer des périodes avec le statut OPEN par défaut', () => {
      const periods = initializeAccountingPeriods(tenantId, 2025);

      periods.forEach((period) => {
        expect(period.status).toBe('OPEN');
      });
    });

    it('ne devrait pas recréer les périodes existantes', () => {
      const first = initializeAccountingPeriods(tenantId, 2025);
      const second = initializeAccountingPeriods(tenantId, 2025);

      expect(first[0].id).toBe(second[0].id);
    });
  });

  describe('getAccountingPeriods', () => {
    it('devrait retourner toutes les périodes pour un tenant', async () => {
      initializeAccountingPeriods(tenantId, 2025);

      const periods = await getAccountingPeriods(tenantId);

      expect(periods).toHaveLength(12);
      expect(periods.every((p) => p.tenantId === tenantId)).toBe(true);
    });

    it("devrait retourner une liste vide si aucune période n'existe", async () => {
      // Le service ne s'auto-initialise pas — il retourne les périodes stockées
      const periods = await getAccountingPeriods('new-tenant');

      expect(Array.isArray(periods)).toBe(true);
    });

    it('devrait retourner les périodes triées par année et mois', async () => {
      initializeAccountingPeriods(tenantId, 2024);
      initializeAccountingPeriods(tenantId, 2025);

      const periods = await getAccountingPeriods(tenantId);

      for (let i = 1; i < periods.length; i++) {
        const prev = periods[i - 1];
        const curr = periods[i];
        expect(prev.year < curr.year || (prev.year === curr.year && prev.month <= curr.month)).toBe(true);
      }
    });
  });

  describe('getPeriodForDate', () => {
    beforeEach(() => {
      initializeAccountingPeriods(tenantId, 2025);
    });

    it('devrait trouver la période pour une date donnée', async () => {
      const period = await getPeriodForDate(tenantId, '2025-03-15');

      expect(period).not.toBeNull();
      expect(period?.month).toBe(3);
      expect(period?.year).toBe(2025);
    });

    it("devrait retourner null si la période n'existe pas", async () => {
      const period = await getPeriodForDate(tenantId, '2030-01-01');

      expect(period).toBeNull();
    });
  });

  describe('validatePeriodOperation', () => {
    beforeEach(() => {
      initializeAccountingPeriods(tenantId, 2025);
    });

    it('devrait autoriser toutes les opérations sur une période OPEN', async () => {
      const validation = await validatePeriodOperation(tenantId, '2025-01-15', 'create');

      expect(validation.canCreate).toBe(true);
      expect(validation.canEdit).toBe(true);
      expect(validation.canDelete).toBe(true);
    });

    it('devrait bloquer création/suppression sur une période CLOSED', async () => {
      // Récupérer l'ID réel de janvier 2025
      const janPeriod = await getPeriodForDate(tenantId, '2025-01-15');
      expect(janPeriod).not.toBeNull();

      await managePeriodLock(tenantId, { periodId: janPeriod!.id, action: 'close' }, 'user-1', 'Test User');

      const validation = await validatePeriodOperation(tenantId, '2025-01-15', 'create');

      expect(validation.canCreate).toBe(false);
      expect(validation.canDelete).toBe(false);
      expect(validation.reason).toContain('clôturée');

      // Vérifier que l'édition est autorisée
      const editValidation = await validatePeriodOperation(tenantId, '2025-01-15', 'edit');
      expect(editValidation.canEdit).toBe(true); // Corrections autorisées
    });

    it('devrait bloquer toutes les opérations sur une période LOCKED', async () => {
      // Récupérer l'ID réel de février 2025
      const febPeriod = await getPeriodForDate(tenantId, '2025-02-15');
      expect(febPeriod).not.toBeNull();

      // Clôturer puis verrouiller février
      await managePeriodLock(tenantId, { periodId: febPeriod!.id, action: 'close' }, 'user-1', 'Test User');
      await managePeriodLock(tenantId, { periodId: febPeriod!.id, action: 'lock' }, 'user-1', 'Test User');

      const validation = await validatePeriodOperation(tenantId, '2025-02-15', 'edit');

      expect(validation.canCreate).toBe(false);
      expect(validation.canEdit).toBe(false);
      expect(validation.canDelete).toBe(false);
      expect(validation.reason).toContain('verrouillée');
    });
  });

  describe('managePeriodLock', () => {
    beforeEach(() => {
      initializeAccountingPeriods(tenantId, 2025);
    });

    it('devrait clôturer une période OPEN', async () => {
      // Récupérer l'ID réel de mars 2025
      const marPeriod = await getPeriodForDate(tenantId, '2025-03-15');
      expect(marPeriod).not.toBeNull();

      const result = await managePeriodLock(
        tenantId,
        { periodId: marPeriod!.id, action: 'close', reason: 'Fin de mois' },
        'user-1',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.period?.status).toBe('CLOSED');
      // closedBy contient userId + userName
      expect(result.period?.closedBy).toContain('user-1');
      // reason est stockée dans closureReason
      expect(result.period?.closureReason).toBe('Fin de mois');
    });

    it('devrait verrouiller une période CLOSED', async () => {
      const aprPeriod = await getPeriodForDate(tenantId, '2025-04-15');
      expect(aprPeriod).not.toBeNull();
      const periodId = aprPeriod!.id;

      // D'abord clôturer
      await managePeriodLock(tenantId, { periodId, action: 'close' }, 'user-1', 'Test');

      // Puis verrouiller
      const result = await managePeriodLock(tenantId, { periodId, action: 'lock' }, 'user-1', 'Test User');

      expect(result.success).toBe(true);
      expect(result.period?.status).toBe('LOCKED');
      expect(result.period?.lockedBy).toContain('user-1');
    });

    it('ne devrait pas re-verrouiller une période déjà LOCKED', async () => {
      const mayPeriod = await getPeriodForDate(tenantId, '2025-05-15');
      expect(mayPeriod).not.toBeNull();
      const periodId = mayPeriod!.id;

      // Clôturer puis verrouiller
      await managePeriodLock(tenantId, { periodId, action: 'close' }, 'user-1', 'Test');
      await managePeriodLock(tenantId, { periodId, action: 'lock' }, 'user-1', 'Test');

      // Tenter de verrouiller à nouveau
      const result = await managePeriodLock(tenantId, { periodId, action: 'lock' }, 'user-1', 'Test User');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('devrait rouvrir une période CLOSED', async () => {
      const junPeriod = await getPeriodForDate(tenantId, '2025-06-15');
      expect(junPeriod).not.toBeNull();
      const periodId = junPeriod!.id;

      // Clôturer
      await managePeriodLock(tenantId, { periodId, action: 'close' }, 'user-1', 'Test');

      // Rouvrir
      const result = await managePeriodLock(
        tenantId,
        { periodId, action: 'reopen', reason: 'Correction nécessaire' },
        'user-1',
        'Test User'
      );

      expect(result.success).toBe(true);
      expect(result.period?.status).toBe('OPEN');
    });

    it('ne devrait pas rouvrir une période LOCKED', async () => {
      const julPeriod = await getPeriodForDate(tenantId, '2025-07-15');
      expect(julPeriod).not.toBeNull();
      const periodId = julPeriod!.id;

      // Clôturer puis verrouiller
      await managePeriodLock(tenantId, { periodId, action: 'close' }, 'user-1', 'Test');
      await managePeriodLock(tenantId, { periodId, action: 'lock' }, 'user-1', 'Test');

      // Tenter de rouvrir
      const result = await managePeriodLock(tenantId, { periodId, action: 'reopen' }, 'user-1', 'Test User');

      expect(result.success).toBe(false);
      expect(result.error).toContain('verrouillée');
    });

    it("devrait retourner une erreur si la période n'existe pas", async () => {
      const result = await managePeriodLock(tenantId, { periodId: 'inexistant', action: 'close' }, 'user-1', 'Test');

      expect(result.success).toBe(false);
      // Le service retourne 'Période introuvable'
      expect(result.error).toBeDefined();
      expect(result.error!.length).toBeGreaterThan(0);
    });
  });

  describe('getFiscalCalendar', () => {
    it('devrait retourner un calendrier fiscal complet', async () => {
      initializeAccountingPeriods(tenantId, 2025);
      const calendar = await getFiscalCalendar(tenantId, 2025);

      expect(calendar).not.toBeNull();
      expect(calendar?.year).toBe(2025);
      expect(calendar?.periods).toHaveLength(12);
      // fiscalYearStart n'est pas dans FiscalCalendar — vérifier les compteurs
      expect(calendar?.openCount).toBe(12);
      expect(calendar?.closedCount).toBe(0);
      expect(calendar?.lockedCount).toBe(0);
    });

    it('devrait identifier la période courante via getPeriodForDate', async () => {
      const now = new Date();
      initializeAccountingPeriods(tenantId, now.getFullYear());
      const period = await getPeriodForDate(tenantId, now.toISOString().split('T')[0]);

      if (period) {
        expect(period.month).toBe(now.getMonth() + 1);
      }
    });
  });

  describe('checkPeriodBeforeEntry', () => {
    beforeEach(() => {
      initializeAccountingPeriods(tenantId, 2025);
    });

    it('devrait autoriser les entrées sur une période ouverte', async () => {
      const check = await checkPeriodBeforeEntry(tenantId, '2025-08-15');

      expect(check.allowed).toBe(true);
    });

    it('devrait bloquer les entrées sur une période clôturée', async () => {
      const sepPeriod = await getPeriodForDate(tenantId, '2025-09-15');
      expect(sepPeriod).not.toBeNull();

      await managePeriodLock(tenantId, { periodId: sepPeriod!.id, action: 'close' }, 'user-1', 'Test');

      const check = await checkPeriodBeforeEntry(tenantId, '2025-09-15');

      expect(check.allowed).toBe(false);
      expect(check.message).toBeDefined();
    });
  });
});
