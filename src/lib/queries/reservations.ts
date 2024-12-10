import { supabase } from '../supabase';
import type { Reservation } from '../../types/database';
import { v4 as uuidv4 } from 'uuid';

export async function getReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*');

  if (error) throw error;
  return data.map((reservation) => ({
    id: reservation.id,
    userId: reservation.user_id,
    pilotId: reservation.pilot_id,
    aircraftId: reservation.aircraft_id,
    flightTypeId: reservation.flight_type_id,
    startTime: reservation.start_time,
    endTime: reservation.end_time,
    withInstructor: reservation.with_instructor,
    instructorId: reservation.instructor_id,
    status: reservation.status,
    comments: reservation.comments,
    createdAt: reservation.created_at,
    updatedAt: reservation.updated_at,
  }));
}

export async function createReservation(data: Partial<Reservation>): Promise<void> {
  try {
    // Get user's club_id
    const { data: userClub, error: clubError } = await supabase
      .from('club_members')
      .select('club_id')
      .eq('user_id', data.userId)
      .single();

    if (clubError) {
      console.error('Error getting user club:', clubError);
      throw clubError;
    }

    if (!userClub?.club_id) {
      throw new Error('User is not a member of any club');
    }

    // Create reservation with club_id
    const { error } = await supabase.from('reservations').insert({
      id: data.id || uuidv4(),
      user_id: data.userId,
      pilot_id: data.pilotId || data.userId,
      aircraft_id: data.aircraftId,
      flight_type_id: data.flightTypeId,
      start_time: data.startTime,
      end_time: data.endTime,
      with_instructor: data.withInstructor,
      instructor_id: data.instructorId || null,
      status: data.status || 'ACTIVE',
      comments: data.comments,
      club_id: userClub.club_id,
    });

    if (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in createReservation:', error);
    throw error;
  }
}

export async function updateReservation(id: string, data: Partial<Reservation>): Promise<void> {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({
        aircraft_id: data.aircraftId,
        start_time: data.startTime,
        end_time: data.endTime,
        pilot_id: data.pilotId || data.userId,
        with_instructor: data.withInstructor,
        instructor_id: data.instructorId || null,
        comments: data.comments,
        status: data.status,
        flight_type_id: data.flightTypeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateReservation:', error);
    throw error;
  }
}

export async function deleteReservation(id: string): Promise<void> {
  try {
    // First delete any associated flight records
    const { error: flightError } = await supabase
      .from('flights')
      .delete()
      .eq('reservation_id', id);

    if (flightError) throw flightError;

    // Then delete the reservation
    const { error: reservationError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (reservationError) throw reservationError;
  } catch (error) {
    console.error('Error deleting reservation:', error);
    throw error;
  }
}