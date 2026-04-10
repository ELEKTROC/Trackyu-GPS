import { z } from 'zod';

// ============================================================================
// Catégories de transactions bancaires (SYSCOHADA)
// ============================================================================
export const BANK_TX_CATEGORIES = [
  { value: 'ENCAISSEMENT_CLIENT', label: 'Encaissement client' },
  { value: 'PAIEMENT_FOURNISSEUR', label: 'Paiement fournisseur' },
  { value: 'VIREMENT_RECU', label: 'Virement reçu' },
  { value: 'VIREMENT_EMIS', label: 'Virement émis' },
  { value: 'PRELEVEMENT', label: 'Prélèvement automatique' },
  { value: 'FRAIS_BANCAIRES', label: 'Frais bancaires' },
  { value: 'COMMISSION', label: 'Commission bancaire' },
  { value: 'REMISE_CHEQUES', label: 'Remise de chèques' },
  { value: 'RETRAIT_ESPECES', label: 'Retrait espèces' },
  { value: 'VERSEMENT_ESPECES', label: 'Versement espèces' },
  { value: 'INTERETS_CREDITEURS', label: 'Intérêts créditeurs' },
  { value: 'INTERETS_DEBITEURS', label: 'Intérêts débiteurs' },
  { value: 'SALAIRES', label: 'Salaires et charges sociales' },
  { value: 'IMPOTS_TAXES', label: 'Impôts et taxes' },
  { value: 'AUTRE', label: 'Autre' },
] as const;

// ============================================================================
// Comptes comptables bancaires (Plan SYSCOHADA - Classe 5 + charges/produits)
// ============================================================================
export const BANK_ACCOUNT_CODES = [
  { code: '', label: '-- Aucun (pas d\'écriture) --' },
  { code: '521000', label: '521000 - Banque (compte principal)' },
  { code: '521100', label: '521100 - Banque (compte secondaire)' },
  { code: '531000', label: '531000 - Chèques à encaisser' },
  { code: '585000', label: '585000 - Virements internes' },
  { code: '627000', label: '627000 - Services bancaires' },
  { code: '627800', label: '627800 - Autres frais et commissions' },
  { code: '768000', label: '768000 - Autres produits financiers' },
  { code: '471000', label: '471000 - Compte d\'attente' },
  { code: '108000', label: '108000 - Compte de l\'exploitant' },
] as const;

// ============================================================================
// Schéma de validation Zod (frontend) — aligné sur le backend BankTransactionSchema
// ============================================================================
export const BankTransactionSchema = z.object({
  date: z.string().min(1, 'La date est requise'),
  description: z.string()
    .min(2, 'La description est requise (min. 2 caractères)')
    .max(500, 'Description trop longue (max. 500 caractères)'),
  amount: z.number()
    .positive('Le montant doit être supérieur à 0'),
  type: z.enum(['CREDIT', 'DEBIT']),
  reference: z.string().max(100, 'Référence trop longue (max. 100)').optional().or(z.literal('')),
  category: z.string().max(100).optional().or(z.literal('')),
  accountCode: z.string().optional().or(z.literal('')),
});

export type BankTransactionFormData = z.infer<typeof BankTransactionSchema>;
