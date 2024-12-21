import { supabase } from '../supabase';
import type { Reservation } from '../../types/database';
import { v4 as uuidv4 } from 'uuid';
import { sendReservationConfirmation, scheduleReservationReminder } from '../../services/reservationNotificationService';

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

    const reservationId = data.id || uuidv4();
    const reservationData = {
      id: reservationId,
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
    };

    // Create reservation with club_id
    const { data: newReservation, error } = await supabase
      .from('reservations')
      .insert(reservationData)
      .select('*, club:club_id(*)')
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }

    if (!newReservation) {
      throw new Error('La réservation a été créée mais les données n\'ont pas été retournées');
    }

    // Convertir les données pour correspondre au type Reservation
    const reservationForNotification: Reservation = {
      id: newReservation.id,
      userId: newReservation.user_id,
      pilotId: newReservation.pilot_id,
      aircraftId: newReservation.aircraft_id,
      flightTypeId: newReservation.flight_type_id,
      startTime: newReservation.start_time,
      endTime: newReservation.end_time,
      withInstructor: newReservation.with_instructor,
      instructorId: newReservation.instructor_id,
      status: newReservation.status,
      comments: newReservation.comments,
      clubId: newReservation.club_id,
      createdAt: newReservation.created_at,
      updatedAt: newReservation.updated_at
    };

    console.log('Données de réservation pour les notifications:', reservationForNotification);

    // Envoyer les notifications par email
    await sendReservationConfirmation(reservationForNotification);
    await scheduleReservationReminder(reservationForNotification);

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