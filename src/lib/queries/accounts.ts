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

export async function getMemberBalance(userId: string) {
  const { data, error } = await supabase
    .from('account_entries')
    .select('amount, is_validated')
    .eq('assigned_to_id', userId);

  if (error) throw error;

  // Calculer le solde validé (uniquement les entrées validées)
  const validated = data
    .filter(entry => entry.is_validated)
    .reduce((acc, entry) => acc + entry.amount, 0);

  // Calculer le solde non validé (uniquement les entrées non validées)
  const unvalidated = data
    .filter(entry => !entry.is_validated)
    .reduce((acc, entry) => acc + entry.amount, 0);

  return {
    validated,   // Solde des entrées validées uniquement
    pending: unvalidated,  // Solde des entrées non validées uniquement
    total: validated + unvalidated // Solde total
  };
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
    .eq('assigned_to_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}