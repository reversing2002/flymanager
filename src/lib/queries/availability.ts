// src/lib/queries/availability.ts
import { supabase } from '../supabase';
import type { Availability, CreateAvailabilityDTO, UpdateAvailabilityDTO } from '../../types/availability';

export async function getAvailabilitiesForPeriod(
  startDate: string,
  endDate: string,
  userId?: string,
  aircraftId?: string
): Promise<Availability[]> {
  let query = supabase
    .from('availabilities')
    .select(`
      *,
      users!user_id (
        id,
        first_name,
        last_name
      ),
      aircraft!aircraft_id (
        id,
        registration,
        name
      )
    `)
    .gte('start_time', startDate)
    .lte('end_time', endDate);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (aircraftId) {
    query = query.eq('aircraft_id', aircraftId);
  }

  const { data, error } = await query.order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching availabilities:', error);
    throw error;
  }
  
  return data || [];
}

export async function createAvailability(data: CreateAvailabilityDTO): Promise<Availability> {
  // Get the user's club_id
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Get the club_id from club_members
  const { data: clubMember, error: clubError } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .single();

  if (clubError) throw clubError;
  if (!clubMember?.club_id) throw new Error('User is not a member of any club');

  // Create availability with club_id
  const { data: availability, error } = await supabase
    .from('availabilities')
    .insert([{
      ...data,
      club_id: clubMember.club_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return availability;
}

export async function updateAvailability(data: UpdateAvailabilityDTO): Promise<void> {
  const { error } = await supabase
    .from('availabilities')
    .update({
      ...data,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.id);

  if (error) throw error;
}

export async function deleteAvailability(id: string): Promise<void> {
  const { error } = await supabase
    .from('availabilities')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
