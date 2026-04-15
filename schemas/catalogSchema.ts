import { z } from 'zod';

export const CatalogSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Le nom est requis'),
  type: z.enum(['Produit', 'Service']),
  category: z.enum(['Matériel', 'Abonnement', 'Prestation', 'Package']),
  price: z.coerce.number().min(0, 'Le prix doit être positif'),
  minPrice: z.coerce.number().min(0).nullable().optional(),
  maxPrice: z.coerce.number().min(0).nullable().optional(),
  unit: z.string().min(1, "L'unité est requise").default('unité'),
  taxRate: z.coerce.number().min(0).max(100).optional().default(0),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  resellerId: z.string().optional(),
  resellerName: z.string().optional(),

  // New fields
  accountingAccountSale: z.string().optional(),
  accountingAccountPurchase: z.string().optional(),
  isSellable: z.boolean().optional().default(true),
  isPurchasable: z.boolean().optional().default(false),
  trackStock: z.boolean().optional().default(false),
  imageUrl: z.string().optional(),
});

export type CatalogInput = z.infer<typeof CatalogSchema>;
