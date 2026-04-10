// types/automation.ts — CRM automation rules

export type AutomationTriggerType =
  | 'LEAD_CREATED' | 'LEAD_STATUS_CHANGED'
  | 'QUOTE_SENT' | 'QUOTE_ACCEPTED' | 'QUOTE_REJECTED'
  | 'INVOICE_CREATED' | 'INVOICE_OVERDUE' | 'INVOICE_PAID'
  | 'CONTRACT_CREATED' | 'CONTRACT_EXPIRING' | 'CONTRACT_EXPIRED'
  | 'PAYMENT_RECEIVED' | 'TASK_DUE' | 'VEHICLE_ALERT';

export type AutomationActionType =
  | 'CREATE_TASK' | 'SEND_EMAIL' | 'SEND_SMS' | 'SEND_TELEGRAM'
  | 'UPDATE_STATUS' | 'ASSIGN_TO_USER' | 'CREATE_DUNNING' | 'WEBHOOK';

export interface AutomationRule {
  id: string;
  name: string;
  triggerType: AutomationTriggerType;
  condition?: {
    field?: string;
    operator?: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN';
    value?: any;
  } | null;
  action: {
    type: AutomationActionType;
    taskTemplate?: {
      title: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueInDays?: number;
      assignTo?: string;
    };
    emailTemplate?: {
      subject: string;
      html: string;
    };
    smsTemplate?: {
      message: string;
    };
    statusUpdate?: {
      newStatus: string;
    };
    webhookUrl?: string;
    messageTemplateId?: string;
  };
  isActive: boolean;
  runCount?: number;
  lastRunAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
