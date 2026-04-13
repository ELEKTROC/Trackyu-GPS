import { z } from 'zod';

export const TechSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  telephone: z.string().optional(),
  societe: z.string().optional(),
  specialite: z.string().min(1, 'La spécialité est requise'),
  niveau: z.enum(['Junior', 'Confirmé', 'Expert']).default('Confirmé'),
  zone: z.string().min(1, 'La zone est requise'),
  statut: z.enum(['Actif', 'Inactif', 'En attente']).default('Actif'),
});

export type TechFormData = z.infer<typeof TechSchema>;
