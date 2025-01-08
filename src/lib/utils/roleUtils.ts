import { supabase } from '../supabase';
import type { UserGroup, SystemRole, Role } from '../../types/roles';

// Map des libellés de rôles en français
const roleLabels = new Map<string, string>([
  ['admin', 'Administrateur'],
  ['instructor', 'Instructeur'],
  ['student', 'Élève'],
  ['pilot', 'Pilote'],
  ['mechanic', 'Mécanicien'],
  ['discovery', 'Découverte'],
  ['modelist', 'Modéliste'],
  ['superadmin', 'Super Admin'],
  ['ulm_pilot', 'Pilote ULM'],
  ['tresorier', 'Trésorier']
]);

/**
 * Met à jour les libellés des rôles
 */
export const updateRoleLabels = (groups: UserGroup[]) => {
  groups.forEach(group => {
    if (group.code && group.name) {
      roleLabels.set(group.code.toLowerCase(), group.name);
    }
  });
};

/**
 * Convertit un rôle en libellé lisible
 */
export const getRoleLabel = (role: string): string => {
  return roleLabels.get(role.toLowerCase()) || role;
};

/**
 * Récupère la classe CSS pour le badge d'un rôle
 */
export const getRoleBadgeClass = (role: string): string => {
  const roleColors = new Map([
    ['admin', 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-500 border border-red-500/20'],
    ['instructor', 'bg-gradient-to-r from-blue-500/20 to-blue-500/10 text-blue-500 border border-blue-500/20'],
    ['student', 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-500 border border-emerald-500/20'],
    ['pilot', 'bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-500 border border-amber-500/20'],
    ['mechanic', 'bg-gradient-to-r from-purple-500/20 to-purple-500/10 text-purple-500 border border-purple-500/20'],
    ['discovery', 'bg-gradient-to-r from-pink-500/20 to-pink-500/10 text-pink-500 border border-pink-500/20'],
    ['modelist', 'bg-gradient-to-r from-indigo-500/20 to-indigo-500/10 text-indigo-500 border border-indigo-500/20'],
    ['superadmin', 'bg-gradient-to-r from-rose-600/20 to-rose-600/10 text-rose-600 border border-rose-600/20'],
    ['ulm_pilot', 'bg-gradient-to-r from-orange-500/20 to-orange-500/10 text-orange-500 border border-orange-500/20'],
    ['tresorier', 'bg-gradient-to-r from-teal-500/20 to-teal-500/10 text-teal-500 border border-teal-500/20']
  ]);
  
  return roleColors.get(role.toLowerCase()) || 'bg-gradient-to-r from-gray-500/20 to-gray-500/10 text-gray-500 border border-gray-500/20';
};

/**
 * Récupère la couleur pour le badge d'un rôle (version MUI)
 */
export const getRoleBadgeColor = (role: string): string => {
  const roleColors = new Map([
    ['admin', 'error'],
    ['instructor', 'primary'],
    ['student', 'success'],
    ['pilot', 'warning'],
    ['mechanic', 'secondary'],
    ['discovery', 'info'],
    ['modelist', 'default'],
    ['superadmin', 'error'],
    ['ulm_pilot', 'warning'],
    ['tresorier', 'success']
  ]);
  
  return roleColors.get(role.toLowerCase()) || 'default';
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