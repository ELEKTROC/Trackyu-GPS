export type MessageCategory = 'PAYMENT' | 'COMMERCIAL' | 'INVOICE' | 'INTERVENTION' | 'ALERT' | 'SYSTEM';

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
