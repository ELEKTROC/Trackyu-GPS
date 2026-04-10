/**
 * Messages toast centralisés pour toute l'application TrackYu GPS.
 * 
 * Convention :
 * - Tous les messages visibles utilisateur sont en français
 * - Pas d'emojis dans les messages (les icônes du toast s'en chargent)
 * - Messages concis (max ~60 caractères)
 * - Ton professionnel et actionnable
 * 
 * Usage :
 *   import { TOAST } from '../constants/toastMessages';
 *   showToast(TOAST.CRUD.CREATED('Véhicule'), 'success');
 *   showToast(TOAST.CRUD.ERROR_CREATE('devis'), 'error');
 */

// ─── CRUD Générique ──────────────────────────────────────────────────
export const CRUD = {
  CREATED: (entity: string) => `${entity} créé(e) avec succès`,
  UPDATED: (entity: string) => `${entity} mis(e) à jour`,
  DELETED: (entity: string) => `${entity} supprimé(e)`,
  DUPLICATED: (entity: string) => `${entity} dupliqué(e)`,
  SAVED: (entity?: string) => entity ? `${entity} enregistré(e)` : 'Enregistrement effectué',
  ARCHIVED: (entity: string) => `${entity} archivé(e)`,
  ACTIVATED: (entity: string) => `${entity} activé(e)`,
  DEACTIVATED: (entity: string) => `${entity} désactivé(e)`,
  
  ERROR_CREATE: (entity: string) => `Erreur lors de la création ${entity ? `du/de la ${entity}` : ''}`.trim(),
  ERROR_UPDATE: (entity: string) => `Erreur lors de la mise à jour ${entity ? `du/de la ${entity}` : ''}`.trim(),
  ERROR_DELETE: (entity: string) => `Erreur lors de la suppression ${entity ? `du/de la ${entity}` : ''}`.trim(),
  ERROR_SAVE: (entity?: string) => `Erreur lors de l'enregistrement${entity ? ` du/de la ${entity}` : ''}`,
  ERROR_LOAD: (entity?: string) => `Erreur lors du chargement${entity ? ` des ${entity}` : ''}`,
  ERROR_DUPLICATE: (entity: string) => `Erreur lors de la duplication ${entity ? `du/de la ${entity}` : ''}`.trim(),
} as const;

// ─── Validation ──────────────────────────────────────────────────────
export const VALIDATION = {
  REQUIRED_FIELDS: 'Veuillez remplir tous les champs obligatoires',
  REQUIRED_FIELD: (field: string) => `Le champ "${field}" est obligatoire`,
  INVALID_EMAIL: 'Adresse email invalide',
  INVALID_PHONE: 'Numéro de téléphone invalide',
  INVALID_FORMAT: (field: string) => `Format invalide pour "${field}"`,
  PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins 6 caractères',
  PASSWORDS_MISMATCH: 'Les mots de passe ne correspondent pas',
  FORM_ERRORS: 'Veuillez corriger les erreurs du formulaire',
  DATE_RANGE_INVALID: 'La date de fin doit être postérieure à la date de début',
} as const;

// ─── Auth & Réseau ──────────────────────────────────────────────────
export const AUTH = {
  SESSION_EXPIRED: 'Session expirée, veuillez vous reconnecter',
  UNAUTHORIZED: 'Accès non autorisé',
  FORBIDDEN: 'Vous n\'avez pas les permissions nécessaires',
  LOGIN_SUCCESS: 'Connexion réussie',
  REGISTRATION_SENT: 'Demande d\'inscription envoyée',
  RESET_EMAIL_SENT: 'Email de réinitialisation envoyé',
  DEMO_REQUEST_SENT: 'Demande envoyée, vous recevrez vos accès par email',
  PROFILE_UPDATED: 'Profil mis à jour avec succès',
  PASSWORD_CHANGED: 'Mot de passe modifié avec succès',
  PASSWORD_RESET: (email: string) => `Mot de passe réinitialisé pour ${email}`,
} as const;

export const NETWORK = {
  ERROR: 'Erreur de connexion au serveur',
  TIMEOUT: 'La requête a expiré, veuillez réessayer',
  OFFLINE: 'Vous êtes hors ligne',
  RETRY: 'Erreur temporaire, nouvelle tentative...',
} as const;

// ─── Finance ─────────────────────────────────────────────────────────
export const FINANCE = {
  PAYMENT_RECORDED: (amount: string) => `Paiement de ${amount} enregistré`,
  PAYMENT_ERROR: 'Erreur lors de l\'enregistrement du paiement',
  INVOICE_SENT: (email: string) => `Facture envoyée à ${email}`,
  QUOTE_ACCEPTED: (ref: string) => `Devis ${ref} accepté`,
  QUOTE_REJECTED: (ref: string) => `Devis ${ref} refusé`,
  QUOTE_CONVERTED: 'Devis converti en facture',
  QUOTE_CONVERT_ERROR: 'Erreur lors de la conversion du devis',
  CREDIT_NOTE_CREATED: (ref?: string) => `Avoir${ref ? ` ${ref}` : ''} créé avec succès`,
  CREDIT_NOTE_ERROR: 'Erreur lors de la création de l\'avoir',
  CREDIT_NOTE_REASON_REQUIRED: 'Veuillez indiquer le motif de l\'avoir',
  CREDIT_NOTE_AMOUNT_INVALID: 'Le montant doit être compris entre 0 et le montant de la facture',
  CONTRACT_GENERATED: 'Contrat généré avec succès',
  STATUS_CHANGED: (status: string) => `Statut changé : ${status}`,
  RECOVERY_SENT: (count: number, channel: string) => `${count} relance(s) envoyée(s) via ${channel}`,
  RECOVERY_PARTIAL: (success: number, errors: number) => `${success} envoyée(s), ${errors} erreur(s)`,
} as const;

// ─── Fleet / GPS ─────────────────────────────────────────────────────
export const FLEET = {
  VEHICLE_IMPORTED: (count: number) => `${count} véhicule(s) importé(s)`,
  DEVICE_APPROVED: 'Boîtier approuvé et ajouté au stock',
  DEVICE_IGNORED: 'Boîtier ignoré',
  COMMAND_SENT: (success: number, failed: number) => `Commandes envoyées : ${success} succès, ${failed} échec(s)`,
  MATERIAL_DETECTED: (imei: string) => `Matériel détecté : ${imei}`,
  SELECT_DEVICE_FIRST: 'Veuillez d\'abord sélectionner un boîtier (IMEI)',
} as const;

// ─── Tech / Interventions ────────────────────────────────────────────
export const TECH = {
  INTERVENTION_STARTED: 'Intervention démarrée',
  INTERVENTION_COMPLETED: 'Intervention marquée comme terminée',
  INTERVENTION_SAVED: 'Intervention sauvegardée',
  INTERVENTION_SAVED_AND_PDF: 'Intervention sauvegardée et bon généré',
  TECH_EN_ROUTE: 'Technicien en route',
  TECH_STARTED: 'Intervention démarrée',
  TICKET_LINKED: (status: string) => `Ticket lié passé en "${status}"`,
  SIGNATURE_MISSING: (who: string, tab: number) => `Signature ${who} manquante (Onglet ${tab})`,
  MUST_BE_IN_PROGRESS: 'L\'intervention doit être démarrée pour être clôturée',
  TRANSFER_INITIATED: 'Transfert initié — en attente de réception',
  TRANSFER_RECEIVED: 'Réception confirmée',
  TRANSFER_REJECTED: 'Transfert rejeté',
  INVENTORY_COMPLETE: 'Inventaire complet validé',
  INVENTORY_PARTIAL: (checked: number, total: number) => `Inventaire partiel : ${checked}/${total} éléments validés`,
  CALIBRATION_TABLE_GENERATED: (shape: string) => `Table de calibrage générée (${shape})`,
  CALIBRATION_FIELDS_REQUIRED: 'Hauteur et Capacité requises',
} as const;

// ─── Support / Tickets ───────────────────────────────────────────────
export const SUPPORT = {
  TICKET_CREATED: 'Ticket créé avec succès',
  TICKET_CREATED_WITH_ATTACHMENTS: (count: number) => `Ticket créé avec ${count} pièce(s) jointe(s)`,
  TICKET_CREATED_ATTACHMENTS_FAILED: 'Ticket créé, mais échec de l\'envoi des pièces jointes',
  TICKET_UPDATED: (id: string) => `Ticket ${id} mis à jour`,
  TICKET_TAKEN: 'Ticket pris en charge',
  TICKET_RESOLVED: 'Ticket résolu',
  TICKET_ESCALATED: 'Ticket escaladé avec succès',
  TICKET_STATUS_CHANGED: (status: string) => `Statut mis à jour : ${status}`,
  TICKET_READONLY: 'Les tickets résolus ou clôturés ne peuvent pas être modifiés',
  TICKET_TECH_ONLY: 'Les techniciens gèrent les interventions, pas les tickets',
  BATCH_TAKEN: (success: number, failed: number) => `${success} ticket(s) pris en charge${failed ? `, ${failed} ignoré(s)` : ''}`,
  BATCH_RESOLVED: (success: number, failed: number) => `${success} ticket(s) résolu(s)${failed ? `, ${failed} ignoré(s)` : ''}`,
  REASON_REQUIRED: 'Le motif est obligatoire',
  MESSAGE_SENT: 'Message envoyé',
  MESSAGE_ERROR: 'Erreur lors de l\'envoi du message',
  INTERVENTION_PLANNED: 'Intervention planifiée avec succès',
  NEW_SUPPORT_REQUEST: (name: string) => `Nouvelle demande de support de ${name}`,
} as const;

// ─── Communication (Email, SMS, Chat) ────────────────────────────────
export const COMM = {
  EMAIL_SENT: (email: string) => `Email envoyé à ${email}`,
  EMAIL_ERROR: 'Erreur lors de l\'envoi de l\'email',
  SMS_SENT: 'SMS envoyé avec succès',
  SMS_ERROR: 'Erreur lors de l\'envoi du SMS',
  SMS_COMMAND_SENT: (cmd: string) => `SMS envoyé : ${cmd}`,
  NOTIFICATION_SENT: 'Notification envoyée avec succès',
  NOTIFICATION_SCHEDULED: 'Notification programmée',
  NOTIFICATION_ERROR: 'Erreur lors de l\'envoi de la notification',
  CHAT_CONVERSATION_STARTED: (name: string) => `Conversation démarrée avec ${name}`,
  CHAT_CONVERSATION_EXISTS: (name: string) => `Conversation existante avec ${name}`,
  CHAT_CLOSED: 'Conversation fermée',
  CHAT_ERROR: 'Erreur lors de la création de la conversation',
  RECIPIENTS_REQUIRED: 'Sélectionnez au moins un destinataire',
} as const;

// ─── Export / Import ─────────────────────────────────────────────────
export const IO = {
  EXPORT_SUCCESS: (format: string, count?: number) => count 
    ? `${count} élément(s) exporté(s) en ${format.toUpperCase()}`
    : `Export ${format.toUpperCase()} téléchargé`,
  EXPORT_ERROR: (format?: string) => `Erreur lors de l'export${format ? ` ${format}` : ''}`,
  IMPORT_SUCCESS: (count: number) => `${count} ligne(s) importée(s)`,
  IMPORT_PARTIAL: (success: number, errors: number) => `${success} importé(s), ${errors} erreur(s)`,
  IMPORT_ERROR: 'Erreur lors de l\'import. Vérifiez le format du fichier',
  IMPORT_INVALID_FORMAT: 'Seuls les fichiers CSV sont acceptés',
  IMPORT_EMPTY: 'Fichier vide ou invalide',
  TEMPLATE_DOWNLOADED: 'Modèle téléchargé',
  PDF_GENERATED: 'PDF généré',
  PDF_DOWNLOADED: 'Document téléchargé',
  PDF_ERROR: 'Erreur lors de la génération du PDF',
  NOTHING_TO_EXPORT: 'Aucun élément à exporter',
} as const;

// ─── Stock ───────────────────────────────────────────────────────────
export const STOCK = {
  SIM_LINKED: 'SIM liée au boîtier avec succès',
  DEVICE_INSTALLED: 'Appareil installé sur le véhicule',
  DEVICE_ASSIGNED: 'Appareil assigné au client',
  ASSIGNMENT_ERROR: 'Erreur lors de l\'assignation',
  TRANSFERRED: (target: string) => `Transféré vers ${target}`,
  BATCH_TRANSFERRED: (count: number, target: string) => `${count} éléments transférés vers ${target}`,
  STATUS_UPDATED: (status: string) => `Statut mis à jour : ${status}`,
} as const;

// ─── Admin ───────────────────────────────────────────────────────────
export const ADMIN = {
  ROLE_CREATED: 'Rôle créé avec succès',
  ROLE_UPDATED: 'Rôle mis à jour',
  ROLE_DELETED: 'Rôle supprimé',
  ROLE_DUPLICATED: 'Rôle dupliqué',
  ROLE_SYSTEM_NO_EDIT: 'Le rôle Superadmin ne peut pas être modifié',
  ROLE_SYSTEM_NO_DELETE: 'Les rôles système ne peuvent pas être supprimés',
  ROLE_NAME_REQUIRED: 'Le nom du rôle est requis',
  PERMISSIONS_SAVED: 'Permissions sauvegardées',
  USER_CREATED: 'Utilisateur créé avec succès',
  USER_UPDATED: 'Utilisateur mis à jour',
  USER_DELETED: 'Utilisateur supprimé',
  USER_ACTIVATED: 'Utilisateur activé',
  USER_DEACTIVATED: 'Utilisateur désactivé',
  USER_NO_DELETE_SUPERADMIN: 'Impossible de supprimer le Superadmin',
  INVITATION_SENT: (email: string) => `Invitation envoyée à ${email}`,
  INVITATION_ERROR: 'Erreur lors de l\'envoi de l\'invitation',
  PASSWORD_GENERATED: (email: string) => `Mot de passe généré pour ${email}`,
  PASSWORD_RESET_ERROR: 'Erreur lors de la réinitialisation du mot de passe',
  REGISTRATION_APPROVED: 'Inscription approuvée avec succès',
  REGISTRATION_REJECTED: 'Demande rejetée',
  RESELLER_CREATED: (slug: string) => `Revendeur créé (Slug: ${slug})`,
  RESELLER_UPDATED: 'Revendeur mis à jour',
  RESELLER_IMPERSONATED: (name: string) => `Connecté en tant que ${name}`,
  WEBHOOK_CREATED: 'Webhook créé',
  WEBHOOK_UPDATED: 'Webhook mis à jour',
  WEBHOOK_DELETED: 'Webhook supprimé',
  WEBHOOK_TEST_SUCCESS: 'Test webhook réussi',
  CONFIG_SAVED: 'Configuration sauvegardée',
  CONFIG_RESET: 'Configuration réinitialisée aux valeurs système',
  LOGS_REFRESHED: 'Logs actualisés',
  TEMPLATE_CREATED: 'Modèle créé',
  TEMPLATE_UPDATED: 'Modèle mis à jour',
  TEMPLATE_DELETED: 'Modèle supprimé',
} as const;

// ─── Clipboard ───────────────────────────────────────────────────────
export const CLIPBOARD = {
  COPIED: 'Copié dans le presse-papiers',
  COMMAND_COPIED: (cmd: string) => `Commande copiée : ${cmd}`,
  PASSWORD_COPIED: 'Mot de passe copié',
} as const;

// ─── CRM ─────────────────────────────────────────────────────────────
export const CRM = {
  LEAD_SAVED: (isEdit: boolean) => isEdit ? 'Lead modifié avec succès' : 'Lead enregistré avec succès',
  LEAD_CONVERTED: (name: string) => `${name} converti en client`,
  LEAD_DUPLICATE_WARNING: (msg: string) => msg,
  CLIENT_CREATED: (name: string) => `Client ${name} créé`,
  CLIENT_UPDATED: (name: string) => `Client ${name} mis à jour`,
  TIER_DELETED: 'Tiers supprimé',
  TIER_BATCH_ACTIVATED: (count: number) => `${count} tiers activé(s)`,
  TIER_BATCH_DEACTIVATED: (count: number) => `${count} tiers désactivé(s)`,
  TIER_BATCH_DELETED: (count: number) => `${count} tiers supprimé(s)`,
  BATCH_EMPTY_SELECTION: 'Aucun élément sélectionné',
  BATCH_ERROR: 'Erreur lors de l\'action de masse',
  CATALOG_ARTICLE_SAVED: (isEdit: boolean) => isEdit ? 'Article modifié' : 'Article ajouté',
  CATALOG_ARTICLE_TOGGLED: (active: boolean) => active ? 'Article activé' : 'Article désactivé',
  CATALOG_ARTICLE_DELETED: 'Article supprimé avec succès',
  TASK_CREATED: 'Tâche créée avec succès',
  TASK_UPDATED: 'Tâche mise à jour',
  TASK_TITLE_REQUIRED: 'Le titre est obligatoire',
  AUTOMATION_CREATED: 'Règle créée',
  AUTOMATION_UPDATED: 'Règle mise à jour',
  AUTOMATION_DELETED: 'Règle supprimée',
  AUTOMATION_DUPLICATED: 'Règle dupliquée',
  CONTRACT_CREATED: 'Contrat créé',
  CONTRACT_UPDATED: 'Contrat mis à jour',
  CONTRACT_DELETED: 'Contrat supprimé',
  CONTRACT_STATUS_CHANGED: (status: string) => `Statut changé : ${status}`,
  CONTRACT_INVOICE_GENERATED: 'Facture brouillon créée. Vérifiez dans le module Finance.',
  COMMENT_ADDED: (type: 'appel' | 'commentaire') => type === 'appel' ? "Note d'appel enregistrée" : "Commentaire ajouté",
  CONTACT_ADDED: (name: string) => `Contact ${name} ajouté`,
  STATUS_CHANGE_REASON_REQUIRED: 'Veuillez sélectionner un statut et saisir un motif',
  FEATURE_COMING_SOON: (action: string) => `${action} — fonctionnalité à venir`,
} as const;

// ─── FAQ ─────────────────────────────────────────────────────────────
export const FAQ = {
  CATEGORY_CREATED: 'Catégorie créée',
  CATEGORY_UPDATED: 'Catégorie mise à jour',
  CATEGORY_DELETED: 'Catégorie supprimée',
  ARTICLE_CREATED: 'Article créé',
  ARTICLE_UPDATED: 'Article mis à jour',
  ARTICLE_DELETED: 'Article supprimé',
  ARTICLE_PUBLISHED: 'Article publié',
  ARTICLE_ARCHIVED: 'Article archivé',
  FEEDBACK_THANKS: 'Merci pour votre retour !',
} as const;

// ─── Macro ───────────────────────────────────────────────────────────
export const MACRO = {
  CREATED: 'Macro créée',
  UPDATED: 'Macro mise à jour',
  DELETED: 'Macro supprimée',
  LABEL_AND_TEXT_REQUIRED: 'Label et texte requis',
} as const;

// ─── Données & Sync ──────────────────────────────────────────────────
export const DATA = {
  SYNC_SUCCESS: 'Synchronisation des données réussie',
  SYNC_ERROR: 'Erreur lors de la synchronisation des données',
  CACHE_CLEARED: 'Cache local vidé avec succès',
  PREFS_RESET: 'Préférences réinitialisées',
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
