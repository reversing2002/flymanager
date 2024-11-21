import { supabase } from '../supabase';
import type { User } from '../../types/database';

export async function updateUser(data: Partial<User> & { id: string }): Promise<void> {
  try {
    // Update user data
    const { error: userError } = await supabase
      .from('users')
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        gender: data.gender,
        birth_date: data.birthDate,
        image_url: data.imageUrl,
        license_number: data.licenseNumber,
        license_expiry: data.licenseExpiry,
        medical_expiry: data.medicalExpiry,
        sep_validity: data.sepValidity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (userError) throw userError;

    // Update qualifications if provided
    if (data.qualifications) {
      // First delete existing qualifications
      const { error: deleteError } = await supabase
        .from('pilot_qualifications')
        .delete()
        .eq('user_id', data.id);

      if (deleteError) throw deleteError;

      // Then insert new ones
      const { error: insertError } = await supabase
        .from('pilot_qualifications')
        .insert(
          data.qualifications.map(qual => ({
            user_id: data.id,
            code: qual.code,
            name: qual.name,
            has_qualification: qual.hasQualification,
          }))
        );

      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function getUserQualifications(userId: string) {
  const { data, error } = await supabase
    .from('pilot_qualifications')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        qualifications:pilot_qualifications (
          id,
          code,
          name,
          has_qualification
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      gender: data.gender,
      birthDate: data.birth_date,
      imageUrl: data.image_url,
      licenseNumber: data.license_number,
      licenseExpiry: data.license_expiry,
      medicalExpiry: data.medical_expiry,
      sepValidity: data.sep_validity,
      qualifications: data.qualifications,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}