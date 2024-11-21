import { supabase } from '../supabase';
import type { AccountEntry } from '../../types/database';

export async function getAccountEntries(): Promise<AccountEntry[]> {
  const { data, error } = await supabase
    .from('account_entries')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAccountEntry(id: string, data: Partial<AccountEntry>): Promise<void> {
  const { error } = await supabase
    .from('account_entries')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function createAccountEntry(data: Partial<AccountEntry>, isAdmin: boolean): Promise<void> {
  // Pour les non-admin, forcer certaines valeurs
  const entryData = isAdmin ? data : {
    ...data,
    user_id: data.user_id, // L'utilisateur connecté
    assigned_to_id: data.user_id, // Même utilisateur
    is_validated: false, // Toujours non validé
  };

  const { error } = await supabase
    .from('account_entries')
    .insert([{
      ...entryData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);

  if (error) throw error;
}

export async function deleteAccountEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('account_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getUserAccountEntries(userId: string): Promise<AccountEntry[]> {
  const { data, error } = await supabase
    .from('account_entries')
    .select('*')
    .or(`user_id.eq.${userId},assigned_to_id.eq.${userId}`)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}