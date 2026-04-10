/**
 * Système de Permissions Granulaires
 * 
 * Structure hiérarchique:
 * MODULE → ONGLET → CHAMP → ACTION (VIEW/CREATE/EDIT/DELETE)
 */

// Actions possibles
export type PermissionAction = 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT' | 'IMPORT';

// Niveau de permission
export type PermissionLevel = 'module' | 'tab' | 'field';

// Interface pour un champ
export interface FieldPermission {
  id: string;
  label: string;
  description?: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'file' | 'relation';
  sensitive?: boolean; // Champs sensibles (prix, IMEI, etc.)
  actions: PermissionAction[];
}

// Interface pour un onglet
export interface TabPermission {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  fields: FieldPermission[];
  actions: PermissionAction[];
}

// Interface pour un module
export interface ModulePermission {
  id: string;
  label: string;
  description?: string;
  icon: string;
  category: 'general' | 'fleet' | 'crm' | 'finance' | 'tech' | 'support' | 'admin';
  tabs: TabPermission[];
  globalActions: PermissionAction[]; // Actions au niveau module (export global, etc.)
}

// Permission assignée à un rôle
export interface RolePermission {
  moduleId: string;
  tabId?: string;
  fieldId?: string;
  actions: PermissionAction[];
}

// Rôle complet avec permissions
export interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string;
  color: string;
  isSystem: boolean; // Rôles système non modifiables
  permissions: RolePermission[];
  mobileTabs?: string[]; // Onglets mobile du bottom nav (View IDs)
  createdAt: string;
  updatedAt: string;
}

// Pour l'affichage dans l'arbre
export interface PermissionTreeNode {
  id: string;
  label: string;
  level: PermissionLevel;
  parentId?: string;
  children?: PermissionTreeNode[];
  actions: PermissionAction[];
  grantedActions?: PermissionAction[];
  sensitive?: boolean;
}

// Résultat de vérification de permission
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  grantedBy?: string; // Quel niveau a accordé la permission
}
