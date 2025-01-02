import { supabase } from '../supabase';
import type { FFACredentials } from '../../types/ffa_credentials';

export const getFFACredentials = async (userId: string): Promise<FFACredentials | null> => {
  const { data, error } = await supabase
    .from('ffa_credentials')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching FFA credentials:', error);
    throw error;
  }

  return data;
};

export const upsertFFACredentials = async (
  userId: string,
  credentials: { ffa_login: string; ffa_password: string }
): Promise<FFACredentials> => {
  const { data, error } = await supabase
    .from('ffa_credentials')
    .upsert({
      user_id: userId,
      ffa_login: credentials.ffa_login,
      ffa_password: credentials.ffa_password,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting FFA credentials:', error);
    throw error;
  }

  return data;
};

export const deleteFFACredentials = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('ffa_credentials')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting FFA credentials:', error);
    throw error;
  }
};
