// types/integrations.ts — External integrations, templates, webhooks, help

export interface Integration {
  id: string;
  provider: 'ORANGE_SMS' | 'SENDGRID' | 'WHATSAPP' | 'SENTRY' | 'OTHER';
  name: string;
  type: 'SMS' | 'EMAIL' | 'MONITORING' | 'PAYMENT';
  status: 'ACTIVE' | 'INACTIVE';
  config: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentTemplate {
  id: string;
  type: 'INVOICE' | 'CONTRACT' | 'EMAIL_ALERT' | 'SMS_ALERT' | 'QUOTE' | 'EMAIL' | 'SMS';
  name: string;
  content: string;
  variables: string[];
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}
