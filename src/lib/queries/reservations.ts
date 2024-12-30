import { supabase } from '../supabase';
import type { Reservation } from '../../types/database';
import { v4 as uuidv4 } from 'uuid';
import { sendReservationConfirmation, scheduleReservationReminder, sendReservationModification, sendReservationCancellation } from '../../services/reservationNotificationService';

export async function getReservations(startTime?: Date, endTime?: Date): Promise<Reservation[]> {
  let query = supabase
    .from('reservations')
    .select('*');

  if (startTime && endTime) {
    query = query
      .gte('start_time', startTime.toISOString())
      .lte('end_time', endTime.toISOString());
  }

  const { data, error } = await query;

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

// Fonction utilitaire pour convertir snake_case en camelCase
function toCamelCase(reservation: any): Reservation {
  return {
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
    clubId: reservation.club_id,
    notes: reservation.notes,
    createdAt: reservation.created_at,
    updatedAt: reservation.updated_at
  };
}

const toSnakeCase = (data: Partial<Reservation>) => {
  const snakeCaseData: any = {};
  Object.entries(data).forEach(([key, value]) => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeCaseData[snakeKey] = value;
  });
  return snakeCaseData;
};

export async function updateReservation(id: string, data: Partial<Reservation>): Promise<void> {
  try {
    // Récupérer la réservation actuelle
    const { data: currentReservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Convertir les données en snake_case avant la mise à jour
    const snakeCaseData = toSnakeCase(data);

    // Mettre à jour la réservation
    const { error: updateError } = await supabase
      .from('reservations')
      .update(snakeCaseData)
      .eq('id', id);

    if (updateError) throw updateError;

    // Convertir en camelCase avant d'envoyer la notification
    const camelCaseReservation = toCamelCase(currentReservation);
    await sendReservationModification(camelCaseReservation, data);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réservation:', error);
    throw error;
  }
}

export async function deleteReservation(id: string): Promise<void> {
  try {
    // Récupérer la réservation avant de la supprimer
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Supprimer la réservation
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Convertir en camelCase avant d'envoyer la notification
    const camelCaseReservation = toCamelCase(reservation);
    await sendReservationCancellation(camelCaseReservation);
  } catch (error) {
    console.error('Erreur lors de la suppression de la réservation:', error);
    throw error;
  }
}