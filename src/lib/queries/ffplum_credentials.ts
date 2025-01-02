import { supabase } from '../supabase';
import type { FFPLUMCredentials } from '../../types/ffplum_credentials';

export const getFFPLUMCredentials = async (userId: string): Promise<FFPLUMCredentials | null> => {
  const { data, error } = await supabase
    .from('ffplum_credentials')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching FFPLUM credentials:', error);
    throw error;
  }

  return data;
};

export const upsertFFPLUMCredentials = async (
  userId: string,
  credentials: { ffplum_login: string; ffplum_password: string }
): Promise<FFPLUMCredentials> => {
  const { data, error } = await supabase
    .from('ffplum_credentials')
    .upsert({
      user_id: userId,
      ffplum_login: credentials.ffplum_login,
      ffplum_password: credentials.ffplum_password,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting FFPLUM credentials:', error);
    throw error;
  }

  return data;
};

export const deleteFFPLUMCredentials = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('ffplum_credentials')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting FFPLUM credentials:', error);
    throw error;
  }
};
