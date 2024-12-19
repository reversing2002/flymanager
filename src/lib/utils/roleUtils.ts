import { supabase } from '../supabase';
import type { UserGroup, SystemRole, Role } from '../../types/roles';

/**
 * Convertit un rôle en libellé lisible
 */
export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    'admin': 'Administrateur',
    'instructor': 'Instructeur',
    'student': 'Élève',
    'pilot': 'Pilote',
    'mechanic': 'Mécanicien',
    'discovery': 'Vol découverte',
    'modelist': 'Modéliste',
    'superadmin': 'Super Admin',
    'ulm_pilot': 'Pilote ULM',
  };
  return labels[role.toLowerCase()] || role;
};

/**
 * Récupère la classe CSS pour le badge d'un rôle
 */
export const getRoleBadgeClass = (role: string): string => {
  const classes: Record<string, string> = {
    'admin': 'bg-red-100 text-red-800',
    'instructor': 'bg-blue-100 text-blue-800',
    'student': 'bg-green-100 text-green-800',
    'pilot': 'bg-yellow-100 text-yellow-800',
    'mechanic': 'bg-purple-100 text-purple-800',
    'discovery': 'bg-pink-100 text-pink-800',
    'modelist': 'bg-indigo-100 text-indigo-800',
    'superadmin': 'bg-red-200 text-red-900',
    'ulm_pilot': 'bg-orange-100 text-orange-800',
  };
  return classes[role.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

/**
 * Récupère la couleur pour le badge d'un rôle (version MUI)
 */
export const getRoleBadgeColor = (role: string): string => {
  const colors: Record<string, string> = {
    'admin': 'bg-red-100 text-red-800',
    'instructor': 'bg-blue-100 text-blue-800',
    'student': 'bg-green-100 text-green-800',
    'pilot': 'bg-yellow-100 text-yellow-800',
    'mechanic': 'bg-purple-100 text-purple-800',
    'discovery': 'bg-pink-100 text-pink-800',
    'modelist': 'bg-indigo-100 text-indigo-800',
    'superadmin': 'bg-red-200 text-red-900',
    'ulm_pilot': 'bg-orange-100 text-orange-800',
  };
  return colors[role.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

/**
 * Récupère tous les groupes d'un club
 */
export async function getUserGroups(clubId: string): Promise<UserGroup[]> {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*')
    .eq('club_id', clubId)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Crée un nouveau groupe d'utilisateurs
 */
export async function createUserGroup(group: Omit<UserGroup, 'id' | 'created_at' | 'updated_at'>): Promise<UserGroup> {
  const { data, error } = await supabase
    .from('user_groups')
    .insert(group)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Met à jour un groupe d'utilisateurs
 */
export async function updateUserGroup(
  groupId: string,
  updates: Partial<Omit<UserGroup, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserGroup> {
  const { data, error } = await supabase
    .from('user_groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Supprime un groupe d'utilisateurs
 */
export async function deleteUserGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('user_groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
}

/**
 * Vérifie si un utilisateur appartient à un groupe spécifique
 */
export function hasGroup(userGroups: string[], groupCode: string): boolean {
  return userGroups.includes(groupCode);
}

/**
 * Vérifie si un utilisateur appartient à au moins un des groupes spécifiés
 */
export function hasAnyGroup(userGroups: string[], groupCodes: string[]): boolean {
  return userGroups.some(group => groupCodes.includes(group));
}

/**
 * Récupère tous les rôles système
 */
export function getSystemRoles(): SystemRole[] {
  return [
    'ADMIN',
    'INSTRUCTOR',
    'PILOT',
    'MECHANIC',
    'STUDENT',
    'DISCOVERY_PILOT'
  ];
}

/**
 * Récupère tous les rôles disponibles pour un club (système + personnalisés)
 */
export async function getAllAvailableRoles(clubId: string): Promise<string[]> {
  try {
    const { data: roles, error } = await supabase
      .from('user_groups')
      .select('code')
      .order('code');

    if (error) throw error;

    return roles.map(role => role.code as string);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
}