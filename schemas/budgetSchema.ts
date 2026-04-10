import { z } from 'zod';

// Budget categories grouped by type (aligned with SYSCOHADA PLAN_COMPTABLE)
export const BUDGET_CATEGORIES = {
  CHARGE: [
    { value: 'Achats de marchandises', accountPrefix: '601000' },
    { value: 'Achats non stockés', accountPrefix: '606000' },
    { value: 'Services extérieurs', accountPrefix: '610000' },
    { value: 'Autres services extérieurs', accountPrefix: '620000' },
    { value: 'Impôts et taxes', accountPrefix: '630000' },
    { value: 'Charges de personnel', accountPrefix: '640000' },
    { value: 'Charges financières', accountPrefix: '660000' },
    { value: 'Dotations aux amortissements', accountPrefix: '681000' },
    { value: 'Toutes Charges', accountPrefix: '6' },
  ],
  PRODUIT: [
    { value: 'Ventes de marchandises', accountPrefix: '701000' },
    { value: 'Prestations de services', accountPrefix: '706000' },
    { value: 'Tous Produits', accountPrefix: '7' },
  ],
} as const;

export type BudgetType = 'CHARGE' | 'PRODUIT';

export const BudgetSchema = z.object({
  year: z.number({ required_error: "L'année est requise" }).int().min(2020, "Année minimum : 2020").max(2100, "Année maximum : 2100"),
  category: z.string().min(1, "La catégorie est requise"),
  accountPrefix: z.string().min(1, "Le compte comptable est requis"),
  allocatedAmount: z.number({ required_error: "Le montant est requis" }).min(0, "Le montant doit être positif"),
  notes: z.string().optional(),
});

export type BudgetFormData = z.infer<typeof BudgetSchema>;
