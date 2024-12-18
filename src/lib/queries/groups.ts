import { supabase } from '../supabase';

export const getAllGroups = async () => {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const getUserGroups = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_group_memberships')
    .select(`
      group_id,
      user_groups (
        id,
        name,
        description
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data.map(membership => membership.user_groups);
};

export const updateUserGroups = async (userId: string, groupIds: string[]) => {
  // D'abord, supprimer tous les groupes existants
  const { error: deleteError } = await supabase
    .from('user_group_memberships')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  // Ensuite, ajouter les nouveaux groupes
  if (groupIds.length > 0) {
    const { error: insertError } = await supabase
      .from('user_group_memberships')
      .insert(
        groupIds.map(groupId => ({
          user_id: userId,
          group_id: groupId
        }))
      );

    if (insertError) throw insertError;
  }
};
