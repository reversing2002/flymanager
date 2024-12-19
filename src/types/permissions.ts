import { Role } from './roles';

export type Permission = {
  id: string;
  label: string;
  description: string;
  allowedRoles: Role[];
};

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: Permission[];
};

// Définition des permissions spécifiques
export const PERMISSIONS = {
  // Gestion des vols
  FLIGHT_VIEW: 'flight:view',
  FLIGHT_CREATE: 'flight:create',
  FLIGHT_MODIFY: 'flight:modify',
  FLIGHT_DELETE: 'flight:delete',

  // Gestion de la formation
  TRAINING_VIEW: 'training:view',
  TRAINING_CREATE: 'training:create',
  TRAINING_MODIFY: 'training:modify',
  TRAINING_DELETE: 'training:delete',

  // Gestion de la maintenance
  MAINTENANCE_VIEW: 'maintenance:view',
  MAINTENANCE_CREATE: 'maintenance:create',
  MAINTENANCE_MODIFY: 'maintenance:modify',
  MAINTENANCE_DELETE: 'maintenance:delete',

  // Gestion des utilisateurs
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_MODIFY: 'user:modify',
  USER_DELETE: 'user:delete',

  // Paramètres
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MODIFY: 'settings:modify',

  // Communication
  CHAT_VIEW: 'chat:view',
  CHAT_SEND: 'chat:send',

  // Événements
  EVENT_VIEW: 'event:view',
  EVENT_CREATE: 'event:create',
  EVENT_MODIFY: 'event:modify',
  EVENT_DELETE: 'event:delete',

  // Documentation
  DOC_VIEW: 'doc:view',
  DOC_MODIFY: 'doc:modify',

  // Progression
  PROGRESSION_VIEW: 'progression:view',
  PROGRESSION_MODIFY: 'progression:modify',

  // Planning
  PLANNING_VIEW: 'planning:view',
  PLANNING_MODIFY: 'planning:modify',

  // Statistiques
  STATS_VIEW: 'stats:view',
} as const;

export type PermissionId = keyof typeof PERMISSIONS;
