// types/admin.ts — Tenant, branches, organization, audit logs

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  currency?: string; // Reseller/Tenant default currency
}

export interface Branch {
  id: string;
  name: string;
  tenantId?: string;
  clientId: string;
  isDefault: boolean;
  createdAt: string;
  
  // Optional legacy/agency fields (deprecated but kept for compatibility if needed)
  ville?: string;
  responsable?: string;
  statut?: 'ACTIVE' | 'INACTIVE';
  email?: string;
  phone?: string;
  description?: string;
  country?: string;
  resellerId?: string;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  currency?: string;
  language?: string;
  date_format?: string;
  country?: string;
  city?: string;
  website?: string;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

// --- AUDIT LOGGING ---
export interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
