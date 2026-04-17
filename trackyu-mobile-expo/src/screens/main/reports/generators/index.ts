/**
 * TrackYu Mobile — Reports: master dispatcher
 * 10 modules complets — câblés progressivement.
 */
import { Vehicle } from '../../../../api/vehicles';
import { ReportFilters, ReportResult } from '../types';
import { generateActivityReport } from './activity';
import { generateAlertsReport } from './alerts';
import { generateFuelReport } from './fuel';
import { generateCrmReport } from './crm';
import { generateFinanceReport } from './finance';
import { generateAccountingReport } from './accounting';
import { generateTechniqueReport } from './technique';
import { generateSupportReport } from './support';
import { generateAdminReport } from './admin';
import { generateSuperadminReport } from './superadmin';

/** Retourne un ReportResult d'erreur affichable à l'utilisateur */
function reportError(title: string, err: unknown): ReportResult {
  const msg = err instanceof Error ? err.message : 'Erreur réseau ou serveur inattendue';
  return {
    title,
    kpis: [{ label: 'Statut', value: 'Erreur', color: '#EF4444' }],
    columns: ['Détail'],
    rows: [[msg]],
    note: 'Vérifiez votre connexion et réessayez. Si le problème persiste, contactez le support.',
  };
}

export async function generateReport(
  moduleId: string,
  subId: string,
  vehicles: Vehicle[],
  filters: ReportFilters
): Promise<ReportResult> {
  try {
    switch (moduleId) {
      case 'activity':
        return await generateActivityReport(subId, vehicles, filters);
      case 'alerts':
        return await generateAlertsReport(subId, filters);
      case 'fuel':
        return await generateFuelReport(subId, vehicles, filters);
      case 'crm':
        return await generateCrmReport(subId, filters);
      case 'finance':
        return await generateFinanceReport(subId, filters);
      case 'accounting':
        return await generateAccountingReport(subId, filters);
      case 'technique':
        return await generateTechniqueReport(subId, vehicles, filters);
      case 'support':
        return await generateSupportReport(subId, filters);
      case 'admin':
        return await generateAdminReport(subId, vehicles, filters);
      case 'superadmin':
        return await generateSuperadminReport(subId, vehicles, filters);
      default:
        return {
          title: `Module inconnu : ${moduleId}`,
          kpis: [{ label: 'Statut', value: 'Inconnu', color: '#6B7280' }],
          columns: ['Module', 'Statut'],
          rows: [[moduleId, 'Non implémenté']],
        };
    }
  } catch (err) {
    if (__DEV__) console.error(`[generateReport] ${moduleId}/${subId}`, err);
    return reportError(`Rapport — ${moduleId} / ${subId}`, err);
  }
}
