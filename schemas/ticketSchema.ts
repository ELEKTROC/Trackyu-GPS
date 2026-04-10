import { z } from 'zod';

// --- ENUMS ---
export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const TicketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED']);
export const SenderSchema = z.enum(['CLIENT', 'SUPPORT', 'SYSTEM']);

// --- SUB-SCHEMAS ---
export const TicketMessageSchema = z.object({
  id: z.string(),
  sender: SenderSchema,
  text: z.string().min(1, "Le message ne peut pas être vide"),
  date: z.date().or(z.string().transform(str => new Date(str))),
});

// --- MAIN SCHEMAS ---
export const TicketSchema = z.object({
  id: z.string(),
  clientId: z.string().min(1, "Le client est obligatoire"),
  vehicleId: z.string().optional(),
  subject: z.string().min(5, "Le sujet doit contenir au moins 5 caractères"),
  description: z.string().min(10, "La description doit être détaillée (min 10 car.)"),
  status: TicketStatusSchema,
  priority: PrioritySchema,
  category: z.string().min(1, "La catégorie est requise"),
  subCategory: z.string().optional(),
  interventionType: z.string().optional(),
  messages: z.array(TicketMessageSchema).default([]),
  assignedTo: z.string().optional(),
  source: z.enum(['TrackYu', 'Appel', 'WhatsApp', 'Visite', 'SMS']).optional().default('TrackYu'),
  receivedAt: z.date().or(z.string().transform(str => new Date(str))).optional(),
  createdAt: z.date().or(z.string().transform(str => new Date(str))),
  updatedAt: z.date().or(z.string().transform(str => new Date(str))),
  startedAt: z.date().or(z.string().transform(str => new Date(str))).optional(),
  resolvedAt: z.date().or(z.string().transform(str => new Date(str))).optional(),
  closedAt: z.date().or(z.string().transform(str => new Date(str))).optional(),
});

// Schema for creating a new ticket (omitting auto-generated fields)
export const CreateTicketSchema = TicketSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true, 
  messages: true,
  status: true 
}).extend({
  description: z.string().min(10, "La description est obligatoire pour la création"),
});

export type TicketInput = z.infer<typeof CreateTicketSchema>;
