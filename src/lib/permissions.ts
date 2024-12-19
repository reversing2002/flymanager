import type { User } from "../types/database";
import { Role } from "../types/roles";
import { PERMISSIONS, type PermissionId } from "../types/permissions";
import { supabase } from "./supabase";
import { useEffect } from 'react';

interface PermissionSetting {
  permission_id: string;
  allowed_roles: Role[];
}

let permissionCache: Record<string, PermissionSetting[]> | null = null;

/**
 * Récupère toutes les permissions depuis la base de données pour un club
 */
export async function fetchPermissions(clubId: string): Promise<PermissionSetting[]> {
  try {
    const { data, error } = await supabase
      .from('permission_settings')
      .select('*')
      .eq('club_id', clubId);

    if (error) {
      console.error('Erreur lors de la récupération des permissions:', error);
      return [];
    }

    return data as PermissionSetting[];
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    return [];
  }
}

/**
 * Met à jour le cache des permissions
 */
export async function updatePermissionCache(clubId: string) {
  const permissions = await fetchPermissions(clubId);
  permissionCache = {
    ...permissionCache,
    [clubId]: permissions
  };
}

/**
 * Vérifie si l'utilisateur appartient à au moins un des groupes spécifiés
 */
export const hasAnyGroup = (user: User | null, groups: Role[]): boolean => {
  if (!user || !user.roles || user.roles.length === 0) return false;
  return user.roles.some(role => 
    groups.some(group => group.toLowerCase() === role.toLowerCase())
  );
};

/**
 * Vérifie si l'utilisateur a une permission spécifique
 */
export const hasPermission = (user: User | null, permissionId: PermissionId): boolean => {
  if (!user?.club?.id || !permissionCache?.[user.club.id]) {
    // Si pas de cache, on utilise le mapping par défaut temporairement
    return hasAnyGroup(user, ['admin']); // Par défaut, seul admin a accès
  }

  const permission = permissionCache[user.club.id].find(p => p.permission_id === permissionId);
  if (!permission) {
    return hasAnyGroup(user, ['admin']); // Permission non trouvée, seul admin a accès
  }

  return hasAnyGroup(user, permission.allowed_roles);
};

/**
 * Hook personnalisé pour vérifier les permissions
 */
export const usePermissions = (user: User | null) => {
  // Si l'utilisateur change de club ou si le cache n'existe pas, on met à jour le cache
  useEffect(() => {
    if (user?.club?.id && (!permissionCache || !permissionCache[user.club.id])) {
      updatePermissionCache(user.club.id);
    }
  }, [user?.club?.id]);

  return {
    // Vols
    canViewFlights: () => hasPermission(user, PERMISSIONS.FLIGHT_VIEW),
    canCreateFlight: () => hasPermission(user, PERMISSIONS.FLIGHT_CREATE),
    canModifyFlight: () => hasPermission(user, PERMISSIONS.FLIGHT_MODIFY),
    canDeleteFlight: () => hasPermission(user, PERMISSIONS.FLIGHT_DELETE),

    // Formation
    canViewTraining: () => hasPermission(user, PERMISSIONS.TRAINING_VIEW),
    canCreateTraining: () => hasPermission(user, PERMISSIONS.TRAINING_CREATE),
    canModifyTraining: () => hasPermission(user, PERMISSIONS.TRAINING_MODIFY),
    canDeleteTraining: () => hasPermission(user, PERMISSIONS.TRAINING_DELETE),

    // Maintenance
    canViewMaintenance: () => hasPermission(user, PERMISSIONS.MAINTENANCE_VIEW),
    canCreateMaintenance: () => hasPermission(user, PERMISSIONS.MAINTENANCE_CREATE),
    canModifyMaintenance: () => hasPermission(user, PERMISSIONS.MAINTENANCE_MODIFY),
    canDeleteMaintenance: () => hasPermission(user, PERMISSIONS.MAINTENANCE_DELETE),

    // Utilisateurs
    canViewUsers: () => hasPermission(user, PERMISSIONS.USER_VIEW),
    canCreateUser: () => hasPermission(user, PERMISSIONS.USER_CREATE),
    canModifyUser: () => hasPermission(user, PERMISSIONS.USER_MODIFY),
    canDeleteUser: () => hasPermission(user, PERMISSIONS.USER_DELETE),

    // Paramètres
    canViewSettings: () => hasPermission(user, PERMISSIONS.SETTINGS_VIEW),
    canModifySettings: () => hasPermission(user, PERMISSIONS.SETTINGS_MODIFY),

    // Chat
    canViewChat: () => hasPermission(user, PERMISSIONS.CHAT_VIEW),
    canSendChat: () => hasPermission(user, PERMISSIONS.CHAT_SEND),

    // Événements
    canViewEvents: () => hasPermission(user, PERMISSIONS.EVENT_VIEW),
    canCreateEvent: () => hasPermission(user, PERMISSIONS.EVENT_CREATE),
    canModifyEvent: () => hasPermission(user, PERMISSIONS.EVENT_MODIFY),
    canDeleteEvent: () => hasPermission(user, PERMISSIONS.EVENT_DELETE),

    // Documentation
    canViewDocs: () => hasPermission(user, PERMISSIONS.DOC_VIEW),
    canModifyDocs: () => hasPermission(user, PERMISSIONS.DOC_MODIFY),

    // Progression
    canViewProgression: () => hasPermission(user, PERMISSIONS.PROGRESSION_VIEW),
    canModifyProgression: () => hasPermission(user, PERMISSIONS.PROGRESSION_MODIFY),

    // Planning
    canViewPlanning: () => hasPermission(user, PERMISSIONS.PLANNING_VIEW),
    canModifyPlanning: () => hasPermission(user, PERMISSIONS.PLANNING_MODIFY),

    // Statistiques
    canViewStats: () => hasPermission(user, PERMISSIONS.STATS_VIEW),
  };
};
