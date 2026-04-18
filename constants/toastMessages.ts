/**
 * Messages toast centralisés pour toute l'application TrackYu GPS.
 *
 * Convention :
 * - Les libellés sont résolus via i18n (clés `toasts.*` dans i18n/locales)
 * - Pas d'emojis dans les messages (les icônes du toast s'en chargent)
 * - Messages concis (max ~60 caractères)
 * - Ton professionnel et actionnable
 *
 * Usage :
 *   import { TOAST } from '../constants/toastMessages';
 *   showToast(TOAST.CRUD.CREATED('Véhicule'), 'success');
 *   showToast(TOAST.CRUD.ERROR_CREATE('devis'), 'error');
 */

import { tGlobal } from '../i18n';

// ─── CRUD Générique ──────────────────────────────────────────────────
export const CRUD = {
  CREATED: (entity: string) => tGlobal('toasts.crud.created', { entity }),
  UPDATED: (entity: string) => tGlobal('toasts.crud.updated', { entity }),
  DELETED: (entity: string) => tGlobal('toasts.crud.deleted', { entity }),
  DUPLICATED: (entity: string) => tGlobal('toasts.crud.duplicated', { entity }),
  SAVED: (entity?: string) => (entity ? tGlobal('toasts.crud.saved', { entity }) : tGlobal('toasts.crud.savedGeneric')),
  ARCHIVED: (entity: string) => tGlobal('toasts.crud.archived', { entity }),
  ACTIVATED: (entity: string) => tGlobal('toasts.crud.activated', { entity }),
  DEACTIVATED: (entity: string) => tGlobal('toasts.crud.deactivated', { entity }),

  ERROR_CREATE: (entity: string) =>
    entity ? tGlobal('toasts.crud.errorCreate', { entity }) : tGlobal('toasts.crud.errorCreateGeneric'),
  ERROR_UPDATE: (entity: string) =>
    entity ? tGlobal('toasts.crud.errorUpdate', { entity }) : tGlobal('toasts.crud.errorUpdateGeneric'),
  ERROR_DELETE: (entity: string) =>
    entity ? tGlobal('toasts.crud.errorDelete', { entity }) : tGlobal('toasts.crud.errorDeleteGeneric'),
  ERROR_SAVE: (entity?: string) =>
    entity ? tGlobal('toasts.crud.errorSave', { entity }) : tGlobal('toasts.crud.errorSaveGeneric'),
  ERROR_LOAD: (entity?: string) =>
    entity ? tGlobal('toasts.crud.errorLoad', { entity }) : tGlobal('toasts.crud.errorLoadGeneric'),
  ERROR_DUPLICATE: (entity: string) =>
    entity ? tGlobal('toasts.crud.errorDuplicate', { entity }) : tGlobal('toasts.crud.errorDuplicateGeneric'),
} as const;

// ─── Validation ──────────────────────────────────────────────────────
export const VALIDATION = {
  get REQUIRED_FIELDS() {
    return tGlobal('toasts.validation.requiredFields');
  },
  REQUIRED_FIELD: (field: string) => tGlobal('toasts.validation.requiredField', { field }),
  get INVALID_EMAIL() {
    return tGlobal('toasts.validation.invalidEmail');
  },
  get INVALID_PHONE() {
    return tGlobal('toasts.validation.invalidPhone');
  },
  INVALID_FORMAT: (field: string) => tGlobal('toasts.validation.invalidFormat', { field }),
  get PASSWORD_TOO_SHORT() {
    return tGlobal('toasts.validation.passwordTooShort');
  },
  get PASSWORDS_MISMATCH() {
    return tGlobal('toasts.validation.passwordsMismatch');
  },
  get FORM_ERRORS() {
    return tGlobal('toasts.validation.formErrors');
  },
  get DATE_RANGE_INVALID() {
    return tGlobal('toasts.validation.dateRangeInvalid');
  },
} as const;

// ─── Auth & Réseau ──────────────────────────────────────────────────
export const AUTH = {
  get SESSION_EXPIRED() {
    return tGlobal('toasts.auth.sessionExpired');
  },
  get UNAUTHORIZED() {
    return tGlobal('toasts.auth.unauthorized');
  },
  get FORBIDDEN() {
    return tGlobal('toasts.auth.forbidden');
  },
  get LOGIN_SUCCESS() {
    return tGlobal('toasts.auth.loginSuccess');
  },
  get REGISTRATION_SENT() {
    return tGlobal('toasts.auth.registrationSent');
  },
  get RESET_EMAIL_SENT() {
    return tGlobal('toasts.auth.resetEmailSent');
  },
  get DEMO_REQUEST_SENT() {
    return tGlobal('toasts.auth.demoRequestSent');
  },
  get PROFILE_UPDATED() {
    return tGlobal('toasts.auth.profileUpdated');
  },
  get PASSWORD_CHANGED() {
    return tGlobal('toasts.auth.passwordChanged');
  },
  PASSWORD_RESET: (email: string) => tGlobal('toasts.auth.passwordReset', { email }),
} as const;

export const NETWORK = {
  get ERROR() {
    return tGlobal('toasts.network.error');
  },
  get TIMEOUT() {
    return tGlobal('toasts.network.timeout');
  },
  get OFFLINE() {
    return tGlobal('toasts.network.offline');
  },
  get RETRY() {
    return tGlobal('toasts.network.retry');
  },
} as const;

// ─── Finance ─────────────────────────────────────────────────────────
export const FINANCE = {
  PAYMENT_RECORDED: (amount: string) => tGlobal('toasts.finance.paymentRecorded', { amount }),
  get PAYMENT_ERROR() {
    return tGlobal('toasts.finance.paymentError');
  },
  INVOICE_SENT: (email: string) => tGlobal('toasts.finance.invoiceSent', { email }),
  QUOTE_ACCEPTED: (ref: string) => tGlobal('toasts.finance.quoteAccepted', { ref }),
  QUOTE_REJECTED: (ref: string) => tGlobal('toasts.finance.quoteRejected', { ref }),
  get QUOTE_CONVERTED() {
    return tGlobal('toasts.finance.quoteConverted');
  },
  get QUOTE_CONVERT_ERROR() {
    return tGlobal('toasts.finance.quoteConvertError');
  },
  CREDIT_NOTE_CREATED: (ref?: string) =>
    ref ? tGlobal('toasts.finance.creditNoteCreated', { ref }) : tGlobal('toasts.finance.creditNoteCreatedGeneric'),
  get CREDIT_NOTE_ERROR() {
    return tGlobal('toasts.finance.creditNoteError');
  },
  get CREDIT_NOTE_REASON_REQUIRED() {
    return tGlobal('toasts.finance.creditNoteReasonRequired');
  },
  get CREDIT_NOTE_AMOUNT_INVALID() {
    return tGlobal('toasts.finance.creditNoteAmountInvalid');
  },
  get CONTRACT_GENERATED() {
    return tGlobal('toasts.finance.contractGenerated');
  },
  STATUS_CHANGED: (status: string) => tGlobal('toasts.finance.statusChanged', { status }),
  RECOVERY_SENT: (count: number, channel: string) => tGlobal('toasts.finance.recoverySent', { count, channel }),
  RECOVERY_PARTIAL: (success: number, errors: number) => tGlobal('toasts.finance.recoveryPartial', { success, errors }),
} as const;

// ─── Fleet / GPS ─────────────────────────────────────────────────────
export const FLEET = {
  VEHICLE_IMPORTED: (count: number) => tGlobal('toasts.fleet.vehicleImported', { count }),
  get DEVICE_APPROVED() {
    return tGlobal('toasts.fleet.deviceApproved');
  },
  get DEVICE_IGNORED() {
    return tGlobal('toasts.fleet.deviceIgnored');
  },
  COMMAND_SENT: (success: number, failed: number) => tGlobal('toasts.fleet.commandSent', { success, failed }),
  MATERIAL_DETECTED: (imei: string) => tGlobal('toasts.fleet.materialDetected', { imei }),
  get SELECT_DEVICE_FIRST() {
    return tGlobal('toasts.fleet.selectDeviceFirst');
  },
} as const;

// ─── Tech / Interventions ────────────────────────────────────────────
export const TECH = {
  get INTERVENTION_STARTED() {
    return tGlobal('toasts.tech.interventionStarted');
  },
  get INTERVENTION_COMPLETED() {
    return tGlobal('toasts.tech.interventionCompleted');
  },
  get INTERVENTION_SAVED() {
    return tGlobal('toasts.tech.interventionSaved');
  },
  get INTERVENTION_SAVED_AND_PDF() {
    return tGlobal('toasts.tech.interventionSavedAndPdf');
  },
  get TECH_EN_ROUTE() {
    return tGlobal('toasts.tech.techEnRoute');
  },
  get TECH_STARTED() {
    return tGlobal('toasts.tech.interventionStarted');
  },
  TICKET_LINKED: (status: string) => tGlobal('toasts.tech.ticketLinked', { status }),
  SIGNATURE_MISSING: (who: string, tab: number) => tGlobal('toasts.tech.signatureMissing', { who, tab }),
  get MUST_BE_IN_PROGRESS() {
    return tGlobal('toasts.tech.mustBeInProgress');
  },
  get TRANSFER_INITIATED() {
    return tGlobal('toasts.tech.transferInitiated');
  },
  get TRANSFER_RECEIVED() {
    return tGlobal('toasts.tech.transferReceived');
  },
  get TRANSFER_REJECTED() {
    return tGlobal('toasts.tech.transferRejected');
  },
  get INVENTORY_COMPLETE() {
    return tGlobal('toasts.tech.inventoryComplete');
  },
  INVENTORY_PARTIAL: (checked: number, total: number) => tGlobal('toasts.tech.inventoryPartial', { checked, total }),
  CALIBRATION_TABLE_GENERATED: (shape: string) => tGlobal('toasts.tech.calibrationTableGenerated', { shape }),
  get CALIBRATION_FIELDS_REQUIRED() {
    return tGlobal('toasts.tech.calibrationFieldsRequired');
  },
} as const;

// ─── Support / Tickets ───────────────────────────────────────────────
export const SUPPORT = {
  get TICKET_CREATED() {
    return tGlobal('toasts.support.ticketCreated');
  },
  TICKET_CREATED_WITH_ATTACHMENTS: (count: number) => tGlobal('toasts.support.ticketCreatedWithAttachments', { count }),
  get TICKET_CREATED_ATTACHMENTS_FAILED() {
    return tGlobal('toasts.support.ticketCreatedAttachmentsFailed');
  },
  TICKET_UPDATED: (id: string) => tGlobal('toasts.support.ticketUpdated', { id }),
  get TICKET_TAKEN() {
    return tGlobal('toasts.support.ticketTaken');
  },
  get TICKET_RESOLVED() {
    return tGlobal('toasts.support.ticketResolved');
  },
  get TICKET_ESCALATED() {
    return tGlobal('toasts.support.ticketEscalated');
  },
  TICKET_STATUS_CHANGED: (status: string) => tGlobal('toasts.support.ticketStatusChanged', { status }),
  get TICKET_READONLY() {
    return tGlobal('toasts.support.ticketReadonly');
  },
  get TICKET_TECH_ONLY() {
    return tGlobal('toasts.support.ticketTechOnly');
  },
  BATCH_TAKEN: (success: number, failed: number) =>
    failed
      ? tGlobal('toasts.support.batchTakenWithFailed', { success, failed })
      : tGlobal('toasts.support.batchTaken', { success }),
  BATCH_RESOLVED: (success: number, failed: number) =>
    failed
      ? tGlobal('toasts.support.batchResolvedWithFailed', { success, failed })
      : tGlobal('toasts.support.batchResolved', { success }),
  get REASON_REQUIRED() {
    return tGlobal('toasts.support.reasonRequired');
  },
  get MESSAGE_SENT() {
    return tGlobal('toasts.support.messageSent');
  },
  get MESSAGE_ERROR() {
    return tGlobal('toasts.support.messageError');
  },
  get INTERVENTION_PLANNED() {
    return tGlobal('toasts.support.interventionPlanned');
  },
  NEW_SUPPORT_REQUEST: (name: string) => tGlobal('toasts.support.newSupportRequest', { name }),
} as const;

// ─── Communication (Email, SMS, Chat) ────────────────────────────────
export const COMM = {
  EMAIL_SENT: (email: string) => tGlobal('toasts.comm.emailSent', { email }),
  get EMAIL_ERROR() {
    return tGlobal('toasts.comm.emailError');
  },
  get SMS_SENT() {
    return tGlobal('toasts.comm.smsSent');
  },
  get SMS_ERROR() {
    return tGlobal('toasts.comm.smsError');
  },
  SMS_COMMAND_SENT: (cmd: string) => tGlobal('toasts.comm.smsCommandSent', { cmd }),
  get NOTIFICATION_SENT() {
    return tGlobal('toasts.comm.notificationSent');
  },
  get NOTIFICATION_SCHEDULED() {
    return tGlobal('toasts.comm.notificationScheduled');
  },
  get NOTIFICATION_ERROR() {
    return tGlobal('toasts.comm.notificationError');
  },
  CHAT_CONVERSATION_STARTED: (name: string) => tGlobal('toasts.comm.chatConversationStarted', { name }),
  CHAT_CONVERSATION_EXISTS: (name: string) => tGlobal('toasts.comm.chatConversationExists', { name }),
  get CHAT_CLOSED() {
    return tGlobal('toasts.comm.chatClosed');
  },
  get CHAT_ERROR() {
    return tGlobal('toasts.comm.chatError');
  },
  get RECIPIENTS_REQUIRED() {
    return tGlobal('toasts.comm.recipientsRequired');
  },
} as const;

// ─── Export / Import ─────────────────────────────────────────────────
export const IO = {
  EXPORT_SUCCESS: (format: string, count?: number) =>
    count
      ? tGlobal('toasts.io.exportSuccessCount', { count, format: format.toUpperCase() })
      : tGlobal('toasts.io.exportSuccess', { format: format.toUpperCase() }),
  EXPORT_ERROR: (format?: string) =>
    format ? tGlobal('toasts.io.exportError', { format }) : tGlobal('toasts.io.exportErrorGeneric'),
  IMPORT_SUCCESS: (count: number) => tGlobal('toasts.io.importSuccess', { count }),
  IMPORT_PARTIAL: (success: number, errors: number) => tGlobal('toasts.io.importPartial', { success, errors }),
  get IMPORT_ERROR() {
    return tGlobal('toasts.io.importError');
  },
  get IMPORT_INVALID_FORMAT() {
    return tGlobal('toasts.io.importInvalidFormat');
  },
  get IMPORT_EMPTY() {
    return tGlobal('toasts.io.importEmpty');
  },
  get TEMPLATE_DOWNLOADED() {
    return tGlobal('toasts.io.templateDownloaded');
  },
  get PDF_GENERATED() {
    return tGlobal('toasts.io.pdfGenerated');
  },
  get PDF_DOWNLOADED() {
    return tGlobal('toasts.io.pdfDownloaded');
  },
  get PDF_ERROR() {
    return tGlobal('toasts.io.pdfError');
  },
  get NOTHING_TO_EXPORT() {
    return tGlobal('toasts.io.nothingToExport');
  },
} as const;

// ─── Stock ───────────────────────────────────────────────────────────
export const STOCK = {
  get SIM_LINKED() {
    return tGlobal('toasts.stock.simLinked');
  },
  get DEVICE_INSTALLED() {
    return tGlobal('toasts.stock.deviceInstalled');
  },
  get DEVICE_ASSIGNED() {
    return tGlobal('toasts.stock.deviceAssigned');
  },
  get ASSIGNMENT_ERROR() {
    return tGlobal('toasts.stock.assignmentError');
  },
  TRANSFERRED: (target: string) => tGlobal('toasts.stock.transferred', { target }),
  BATCH_TRANSFERRED: (count: number, target: string) => tGlobal('toasts.stock.batchTransferred', { count, target }),
  STATUS_UPDATED: (status: string) => tGlobal('toasts.stock.statusUpdated', { status }),
} as const;

// ─── Admin ───────────────────────────────────────────────────────────
export const ADMIN = {
  get ROLE_CREATED() {
    return tGlobal('toasts.admin.roleCreated');
  },
  get ROLE_UPDATED() {
    return tGlobal('toasts.admin.roleUpdated');
  },
  get ROLE_DELETED() {
    return tGlobal('toasts.admin.roleDeleted');
  },
  get ROLE_DUPLICATED() {
    return tGlobal('toasts.admin.roleDuplicated');
  },
  get ROLE_SYSTEM_NO_EDIT() {
    return tGlobal('toasts.admin.roleSystemNoEdit');
  },
  get ROLE_SYSTEM_NO_DELETE() {
    return tGlobal('toasts.admin.roleSystemNoDelete');
  },
  get ROLE_NAME_REQUIRED() {
    return tGlobal('toasts.admin.roleNameRequired');
  },
  get PERMISSIONS_SAVED() {
    return tGlobal('toasts.admin.permissionsSaved');
  },
  get USER_CREATED() {
    return tGlobal('toasts.admin.userCreated');
  },
  get USER_UPDATED() {
    return tGlobal('toasts.admin.userUpdated');
  },
  get USER_DELETED() {
    return tGlobal('toasts.admin.userDeleted');
  },
  get USER_ACTIVATED() {
    return tGlobal('toasts.admin.userActivated');
  },
  get USER_DEACTIVATED() {
    return tGlobal('toasts.admin.userDeactivated');
  },
  get USER_NO_DELETE_SUPERADMIN() {
    return tGlobal('toasts.admin.userNoDeleteSuperadmin');
  },
  INVITATION_SENT: (email: string) => tGlobal('toasts.admin.invitationSent', { email }),
  get INVITATION_ERROR() {
    return tGlobal('toasts.admin.invitationError');
  },
  PASSWORD_GENERATED: (email: string) => tGlobal('toasts.admin.passwordGenerated', { email }),
  get PASSWORD_RESET_ERROR() {
    return tGlobal('toasts.admin.passwordResetError');
  },
  get REGISTRATION_APPROVED() {
    return tGlobal('toasts.admin.registrationApproved');
  },
  get REGISTRATION_REJECTED() {
    return tGlobal('toasts.admin.registrationRejected');
  },
  RESELLER_CREATED: (slug: string) => tGlobal('toasts.admin.resellerCreated', { slug }),
  get RESELLER_UPDATED() {
    return tGlobal('toasts.admin.resellerUpdated');
  },
  RESELLER_IMPERSONATED: (name: string) => tGlobal('toasts.admin.resellerImpersonated', { name }),
  get WEBHOOK_CREATED() {
    return tGlobal('toasts.admin.webhookCreated');
  },
  get WEBHOOK_UPDATED() {
    return tGlobal('toasts.admin.webhookUpdated');
  },
  get WEBHOOK_DELETED() {
    return tGlobal('toasts.admin.webhookDeleted');
  },
  get WEBHOOK_TEST_SUCCESS() {
    return tGlobal('toasts.admin.webhookTestSuccess');
  },
  get CONFIG_SAVED() {
    return tGlobal('toasts.admin.configSaved');
  },
  get CONFIG_RESET() {
    return tGlobal('toasts.admin.configReset');
  },
  get LOGS_REFRESHED() {
    return tGlobal('toasts.admin.logsRefreshed');
  },
  get TEMPLATE_CREATED() {
    return tGlobal('toasts.admin.templateCreated');
  },
  get TEMPLATE_UPDATED() {
    return tGlobal('toasts.admin.templateUpdated');
  },
  get TEMPLATE_DELETED() {
    return tGlobal('toasts.admin.templateDeleted');
  },
} as const;

// ─── Clipboard ───────────────────────────────────────────────────────
export const CLIPBOARD = {
  get COPIED() {
    return tGlobal('toasts.clipboard.copied');
  },
  COMMAND_COPIED: (cmd: string) => tGlobal('toasts.clipboard.commandCopied', { cmd }),
  get PASSWORD_COPIED() {
    return tGlobal('toasts.clipboard.passwordCopied');
  },
} as const;

// ─── CRM ─────────────────────────────────────────────────────────────
export const CRM = {
  LEAD_SAVED: (isEdit: boolean) => (isEdit ? tGlobal('toasts.crm.leadSavedEdit') : tGlobal('toasts.crm.leadSavedNew')),
  LEAD_CONVERTED: (name: string) => tGlobal('toasts.crm.leadConverted', { name }),
  LEAD_DUPLICATE_WARNING: (msg: string) => msg,
  CLIENT_CREATED: (name: string) => tGlobal('toasts.crm.clientCreated', { name }),
  CLIENT_UPDATED: (name: string) => tGlobal('toasts.crm.clientUpdated', { name }),
  get TIER_DELETED() {
    return tGlobal('toasts.crm.tierDeleted');
  },
  TIER_BATCH_ACTIVATED: (count: number) => tGlobal('toasts.crm.tierBatchActivated', { count }),
  TIER_BATCH_DEACTIVATED: (count: number) => tGlobal('toasts.crm.tierBatchDeactivated', { count }),
  TIER_BATCH_DELETED: (count: number) => tGlobal('toasts.crm.tierBatchDeleted', { count }),
  get BATCH_EMPTY_SELECTION() {
    return tGlobal('toasts.crm.batchEmptySelection');
  },
  get BATCH_ERROR() {
    return tGlobal('toasts.crm.batchError');
  },
  CATALOG_ARTICLE_SAVED: (isEdit: boolean) =>
    isEdit ? tGlobal('toasts.crm.catalogArticleSavedEdit') : tGlobal('toasts.crm.catalogArticleSavedNew'),
  CATALOG_ARTICLE_TOGGLED: (active: boolean) =>
    active ? tGlobal('toasts.crm.catalogArticleActivated') : tGlobal('toasts.crm.catalogArticleDeactivated'),
  get CATALOG_ARTICLE_DELETED() {
    return tGlobal('toasts.crm.catalogArticleDeleted');
  },
  get TASK_CREATED() {
    return tGlobal('toasts.crm.taskCreated');
  },
  get TASK_UPDATED() {
    return tGlobal('toasts.crm.taskUpdated');
  },
  get TASK_TITLE_REQUIRED() {
    return tGlobal('toasts.crm.taskTitleRequired');
  },
  get AUTOMATION_CREATED() {
    return tGlobal('toasts.crm.automationCreated');
  },
  get AUTOMATION_UPDATED() {
    return tGlobal('toasts.crm.automationUpdated');
  },
  get AUTOMATION_DELETED() {
    return tGlobal('toasts.crm.automationDeleted');
  },
  get AUTOMATION_DUPLICATED() {
    return tGlobal('toasts.crm.automationDuplicated');
  },
  get CONTRACT_CREATED() {
    return tGlobal('toasts.crm.contractCreated');
  },
  get CONTRACT_UPDATED() {
    return tGlobal('toasts.crm.contractUpdated');
  },
  get CONTRACT_DELETED() {
    return tGlobal('toasts.crm.contractDeleted');
  },
  CONTRACT_STATUS_CHANGED: (status: string) => tGlobal('toasts.crm.contractStatusChanged', { status }),
  get CONTRACT_INVOICE_GENERATED() {
    return tGlobal('toasts.crm.contractInvoiceGenerated');
  },
  COMMENT_ADDED: (type: 'appel' | 'commentaire') =>
    type === 'appel' ? tGlobal('toasts.crm.commentAddedCall') : tGlobal('toasts.crm.commentAddedNote'),
  CONTACT_ADDED: (name: string) => tGlobal('toasts.crm.contactAdded', { name }),
  get STATUS_CHANGE_REASON_REQUIRED() {
    return tGlobal('toasts.crm.statusChangeReasonRequired');
  },
  FEATURE_COMING_SOON: (action: string) => tGlobal('toasts.crm.featureComingSoon', { action }),
} as const;

// ─── FAQ ─────────────────────────────────────────────────────────────
export const FAQ = {
  get CATEGORY_CREATED() {
    return tGlobal('toasts.faq.categoryCreated');
  },
  get CATEGORY_UPDATED() {
    return tGlobal('toasts.faq.categoryUpdated');
  },
  get CATEGORY_DELETED() {
    return tGlobal('toasts.faq.categoryDeleted');
  },
  get ARTICLE_CREATED() {
    return tGlobal('toasts.faq.articleCreated');
  },
  get ARTICLE_UPDATED() {
    return tGlobal('toasts.faq.articleUpdated');
  },
  get ARTICLE_DELETED() {
    return tGlobal('toasts.faq.articleDeleted');
  },
  get ARTICLE_PUBLISHED() {
    return tGlobal('toasts.faq.articlePublished');
  },
  get ARTICLE_ARCHIVED() {
    return tGlobal('toasts.faq.articleArchived');
  },
  get FEEDBACK_THANKS() {
    return tGlobal('toasts.faq.feedbackThanks');
  },
} as const;

// ─── Macro ───────────────────────────────────────────────────────────
export const MACRO = {
  get CREATED() {
    return tGlobal('toasts.macro.created');
  },
  get UPDATED() {
    return tGlobal('toasts.macro.updated');
  },
  get DELETED() {
    return tGlobal('toasts.macro.deleted');
  },
  get LABEL_AND_TEXT_REQUIRED() {
    return tGlobal('toasts.macro.labelAndTextRequired');
  },
} as const;

// ─── Données & Sync ──────────────────────────────────────────────────
export const DATA = {
  get SYNC_SUCCESS() {
    return tGlobal('toasts.data.syncSuccess');
  },
  get SYNC_ERROR() {
    return tGlobal('toasts.data.syncError');
  },
  get CACHE_CLEARED() {
    return tGlobal('toasts.data.cacheCleared');
  },
  get PREFS_RESET() {
    return tGlobal('toasts.data.prefsReset');
  },
} as const;

// ─── Objet unique d'export ──────────────────────────────────────────
export const TOAST = {
  CRUD,
  VALIDATION,
  AUTH,
  NETWORK,
  FINANCE,
  FLEET,
  TECH,
  SUPPORT,
  COMM,
  IO,
  STOCK,
  ADMIN,
  CRM,
  FAQ,
  MACRO,
  CLIPBOARD,
  DATA,
} as const;
