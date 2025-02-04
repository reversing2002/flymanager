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
        last_name,
        email,
        default_mode
      ),
      aircraft!aircraft_id (
        id,
        registration,
        name
      ),
      instructor_calendars!instructor_calendar_id (
        id,
        calendar_id,
        calendar_name,
        color
      )
    `)
    .or(`and(end_time.gte.${startDate},start_time.lte.${endDate}),and(is_recurring.eq.true,or(recurrence_end_date.gte.${startDate},recurrence_end_date.is.null))`);

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
      slot_type: data.slot_type,
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
      slot_type: data.slot_type,
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

// Nouvelle fonction pour obtenir les réservations comme indisponibilités
export async function getReservationsAsAvailabilities(
  startDate: string,
  endDate: string,
  userId?: string,
  aircraftId?: string
): Promise<Availability[]> {
  let query = supabase
    .from('reservations')
    .select(`
      id,
      start_time,
      end_time,
      user_id,
      aircraft_id,
      instructor_id,
      users!user_id (
        id,
        first_name,
        last_name,
        email
      ),
      aircraft!aircraft_id (
        id,
        registration,
        name
      ),
      instructor:users!instructor_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .gte('end_time', startDate)
    .lte('start_time', endDate);

  if (userId) {
    query = query.or(`user_id.eq.${userId},instructor_id.eq.${userId}`);
  }

  if (aircraftId) {
    query = query.eq('aircraft_id', aircraftId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching reservations:', error);
    throw error;
  }

  // Convertir les réservations en indisponibilités
  return (data || []).map(reservation => ({
    id: `reservation-${reservation.id}`,
    start_time: reservation.start_time,
    end_time: reservation.end_time,
    user_id: reservation.user_id,
    aircraft_id: reservation.aircraft_id,
    slot_type: 'reservation',
    is_recurring: false,
    users: reservation.users,
    aircraft: reservation.aircraft,
    instructor_id: reservation.instructor_id,
    instructor: reservation.instructor,
    club_id: null, // Sera rempli par la base de données
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
}
