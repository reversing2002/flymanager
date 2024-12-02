import { supabase } from '../supabase';
import type { MedicalCertification } from '../../types/database';

export async function getMedicalCertifications(userId: string): Promise<MedicalCertification[]> {
  const { data, error } = await supabase
    .from('medical_certifications')
    .select('*')
    .eq('user_id', userId)
    .order('valid_until', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMedicalCertification(data: Partial<MedicalCertification>): Promise<void> {
  const { error } = await supabase
    .from('medical_certifications')
    .insert([data]);

  if (error) throw error;
}

export async function updateMedicalCertification(
  id: string,
  data: Partial<MedicalCertification>
): Promise<void> {
  const { error } = await supabase
    .from('medical_certifications')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteMedicalCertification(id: string): Promise<void> {
  const { error } = await supabase
    .from('medical_certifications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}