// types/support.ts — Tickets, categories

export interface TicketMessage {
  id: string;
  ticketId?: string;
  sender: 'CLIENT' | 'SUPPORT' | 'SYSTEM' | string;
  text: string;
  isInternal?: boolean;
  date: Date;
  createdAt?: string;
  attachments?: string[]; // URLs or base64 strings
}

export interface Ticket {
  id: string;
  tenantId: string;
  clientId: string;
  clientName?: string;  // Nom du client (depuis JOIN backend)
  vehicleId?: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_CLIENT' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  subCategory?: string;
  interventionType?: string;
  messages: TicketMessage[];
  assignedTo?: string; // User ID
  assignedUserName?: string;  // Nom de l'utilisateur assigné (depuis JOIN backend)
  location?: string; // Adresse/lieu du ticket
  contactPhone?: string; // Téléphone de contact
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date; // Date de prise en charge (passage à IN_PROGRESS)
  resolvedAt?: Date; // Date de résolution (passage à RESOLVED)
  closedAt?: Date; // Date de clôture (passage à CLOSED)
  firstResponseAt?: Date; // Date de première réponse
  dueDate?: string; // Date d'échéance
  tags?: string[]; // Tags/étiquettes
  source?: 'TrackYu' | 'Appel' | 'WhatsApp' | 'Visite' | 'SMS'; // Canal de réception de la demande
  receivedAt?: Date; // Date de réception effective de la demande
  resellerId?: string;
  resellerName?: string;
  // Creator tracking
  createdBy?: string; // User ID qui a créé le ticket
  createdByName?: string; // Nom de l'utilisateur (depuis JOIN backend)
  // Escalation tracking
  escalationCount?: number; // Nombre d'escalades
  escalatedAt?: Date; // Date de dernière escalade
  escalatedBy?: string; // User ID qui a escaladé
}

export interface TicketCategory {
  id: number;
  name: string;
  icon?: string;
  isActive: boolean;
}

export interface TicketSubCategory {
  id: number;
  categoryId: number;
  name: string;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  slaHours: number;
  isActive: boolean;
}
