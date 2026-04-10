import { z } from 'zod';

// ============================================================================
// Schéma de validation — Opération de Caisse
// ============================================================================
export const CashOperationSchema = z.object({
  date: z.string().min(1, 'La date est requise'),
  label: z.string()
    .min(2, 'Le libellé est requis (min. 2 caractères)')
    .max(200, 'Libellé trop long (max. 200 caractères)'),
  amount: z.number()
    .positive('Le montant doit être supérieur à 0'),
  transactionType: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  reference: z.string().max(100, 'Référence trop longue').optional().or(z.literal('')),
});

export type CashOperationFormData = z.infer<typeof CashOperationSchema>;

// ============================================================================
// Schéma de validation — Arrêté de Caisse Journalier
// ============================================================================
export const CashClosingSchema = z.object({
  closingDate: z.string().min(1, 'La date est requise'),
  actualClosingBalance: z.number({ message: 'Le solde réel est requis' }),
  closingNotes: z.string().max(500, 'Notes trop longues (max. 500)').optional().or(z.literal('')),
});

export type CashClosingFormData = z.infer<typeof CashClosingSchema>;

// ============================================================================
// Catégories de caisse prédéfinies
// ============================================================================
export const CASH_OPERATION_LABELS = [
  { value: 'Achat fournitures bureau', type: 'WITHDRAWAL' },
  { value: 'Achat carburant', type: 'WITHDRAWAL' },
  { value: 'Frais de transport', type: 'WITHDRAWAL' },
  { value: 'Petit matériel', type: 'WITHDRAWAL' },
  { value: 'Frais de réception', type: 'WITHDRAWAL' },
  { value: 'Remboursement frais', type: 'WITHDRAWAL' },
  { value: 'Encaissement client espèces', type: 'DEPOSIT' },
  { value: 'Approvisionnement caisse', type: 'DEPOSIT' },
  { value: 'Versement espèces', type: 'DEPOSIT' },
] as const;
