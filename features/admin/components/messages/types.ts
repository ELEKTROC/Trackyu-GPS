export type MessageCategory = 'PAYMENT' | 'COMMERCIAL' | 'INVOICE' | 'INTERVENTION' | 'ALERT' | 'SYSTEM';

export type MessageChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'TELEGRAM';

export type MessageTrigger =
  | 'MANUAL'
  | 'SCHEDULED'
  | 'AUTO_PAYMENT_DUE'
  | 'AUTO_LEAD_FOLLOWUP'
  | 'AUTO_QUOTE_FOLLOWUP'
  | 'AUTO_ALERT'
  | 'AUTO_INTERVENTION';

export interface MessageTemplate {
  id: string;
  name: string;
  category: MessageCategory;
  channel: MessageChannel;
  type?: string; // alias de channel, posé par la couche API
  trigger: MessageTrigger;
  subject?: string;
  content: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  delay_days?: number;
}

export interface CategoryConfig {
  id: MessageCategory;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface ChannelConfig {
  id: string;
  label: string;
  icon: string;
  color: string;
  supportsHtml: boolean;
  supportsSubject: boolean;
  maxLength?: number;
}

export interface TemplateVariable {
  key: string;
  label: string;
  example: string;
  category: string;
}
