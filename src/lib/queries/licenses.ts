import { supabase } from '../supabase';

export async function getUserLicenses(userId: string) {
  const { data, error } = await supabase
    .from('pilot_licenses')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function getUserQualifications(userId: string) {
  const { data, error } = await supabase
    .from('pilot_qualifications')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function updatePilotLicenses(userId: string, licenses: any[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('pilot_licenses')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  if (licenses.length > 0) {
    const { error: insertError } = await supabase
      .from('pilot_licenses')
      .insert(licenses.map(license => ({
        user_id: userId,
        type: license.type,
        number: license.number,
        is_student: license.isStudent,
        valid_until: license.validUntil,
      })));

    if (insertError) throw insertError;
  }
}

export async function updatePilotQualifications(userId: string, qualifications: any[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('pilot_qualifications')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  if (qualifications.length > 0) {
    const { error: insertError } = await supabase
      .from('pilot_qualifications')
      .insert(qualifications.map(qual => ({
        user_id: userId,
        code: qual.code,
        name: qual.name,
        has_qualification: qual.hasQualification,
      })));

    if (insertError) throw insertError;
  }
}