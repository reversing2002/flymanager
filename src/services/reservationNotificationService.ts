import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';
import type { Reservation } from '../types/database';
import { addHours, subHours } from 'date-fns';

// Templates Mailjet
const TEMPLATES = {
  PILOT_CONFIRMATION: 4242424,    // Template pour la confirmation au pilote
  INSTRUCTOR_CONFIRMATION: 4242425, // Template pour la confirmation à l'instructeur
  PILOT_REMINDER: 4242426,        // Template pour le rappel au pilote
  INSTRUCTOR_REMINDER: 4242427    // Template pour le rappel à l'instructeur
};

interface ReservationEmailData {
  pilotName: string;
  pilotEmail: string;
  instructorName?: string;
  instructorEmail?: string;
  aircraftRegistration: string;
  startTime: string;
  endTime: string;
  flightType: string;
}

async function getReservationEmailData(reservation: Reservation): Promise<ReservationEmailData | null> {
  try {
    console.log('Récupération des données pour l\'email de réservation:', reservation);

    if (!reservation.pilotId) {
      console.error('ID du pilote manquant dans la réservation');
      return null;
    }

    // Récupérer les informations du pilote
    const { data: pilot, error: pilotError } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', reservation.pilotId)
      .single();

    if (pilotError || !pilot) {
      console.error('Erreur lors de la récupération des informations du pilote:', pilotError);
      return null;
    }

    // Récupérer les informations de l'instructeur si présent
    let instructor = null;
    if (reservation.instructorId) {
      console.log('Récupération des informations de l\'instructeur:', reservation.instructorId);
      const { data: instructorData, error: instructorError } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', reservation.instructorId)
        .single();
      
      if (instructorError) {
        console.error('Erreur lors de la récupération des informations de l\'instructeur:', instructorError);
      } else {
        instructor = instructorData;
      }
    }

    if (!reservation.aircraftId) {
      console.error('ID de l\'avion manquant dans la réservation');
      return null;
    }

    // Récupérer les informations de l'avion
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('registration')
      .eq('id', reservation.aircraftId)
      .single();

    if (aircraftError || !aircraft) {
      console.error('Erreur lors de la récupération des informations de l\'avion:', aircraftError);
      return null;
    }

    if (!reservation.flightTypeId) {
      console.error('ID du type de vol manquant dans la réservation');
      return null;
    }

    // Récupérer le type de vol
    const { data: flightType, error: flightTypeError } = await supabase
      .from('flight_types')
      .select('name')
      .eq('id', reservation.flightTypeId)
      .single();

    if (flightTypeError || !flightType) {
      console.error('Erreur lors de la récupération du type de vol:', flightTypeError);
      return null;
    }

    const emailData = {
      pilotName: `${pilot.first_name} ${pilot.last_name}`,
      pilotEmail: pilot.email,
      instructorName: instructor ? `${instructor.first_name} ${instructor.last_name}` : undefined,
      instructorEmail: instructor?.email,
      aircraftRegistration: aircraft.registration,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      flightType: flightType.name
    };

    console.log('Données email préparées:', emailData);
    return emailData;

  } catch (error) {
    console.error('Erreur lors de la récupération des données pour l\'email:', error);
    return null;
  }
}

export async function sendReservationConfirmation(reservation: Reservation): Promise<void> {
  console.log('Début de l\'envoi de la confirmation de réservation');
  
  const emailData = await getReservationEmailData(reservation);
  
  if (!emailData) {
    console.error('Impossible d\'envoyer l\'email de confirmation : données manquantes');
    return;
  }

  if (!reservation.clubId) {
    console.error('ID du club manquant dans la réservation');
    return;
  }
  
  // Créer la notification pour le pilote
  try {
    await createNotification({
      type: 'reservation_confirmation',
      user_id: reservation.pilotId,
      scheduled_date: new Date().toISOString(),
      sent: false,
      variables: {
        PILOT_NAME: emailData.pilotName,
        AIRCRAFT: emailData.aircraftRegistration,
        START_TIME: emailData.startTime,
        END_TIME: emailData.endTime,
        FLIGHT_TYPE: emailData.flightType,
        INSTRUCTOR_NAME: emailData.instructorName || 'Aucun instructeur',
      },
      club_id: reservation.clubId,
    });

    console.log('Notification de confirmation créée pour le pilote');

    // Si un instructeur est assigné, créer une notification pour lui aussi
    if (reservation.instructorId && emailData.instructorName && emailData.instructorEmail) {
      await createNotification({
        type: 'reservation_confirmation_instructor',
        user_id: reservation.instructorId,
        scheduled_date: new Date().toISOString(),
        sent: false,
        variables: {
          INSTRUCTOR_NAME: emailData.instructorName,
          PILOT_NAME: emailData.pilotName,
          AIRCRAFT: emailData.aircraftRegistration,
          START_TIME: emailData.startTime,
          END_TIME: emailData.endTime,
          FLIGHT_TYPE: emailData.flightType,
        },
        club_id: reservation.clubId,
      });
      console.log('Notification de confirmation créée pour l\'instructeur');
    }
  } catch (error) {
    console.error('Erreur lors de la création des notifications de confirmation:', error);
  }
}

export async function scheduleReservationReminder(reservation: Reservation): Promise<void> {
  console.log('Planification du rappel de réservation');

  // Vérifier si la réservation est dans moins de 2 heures
  const reservationTime = new Date(reservation.startTime);
  const now = new Date();
  const twoHoursFromNow = addHours(now, 2);

  if (reservationTime <= twoHoursFromNow) {
    console.log('Réservation dans moins de 2 heures, pas de rappel planifié');
    return;
  }

  const emailData = await getReservationEmailData(reservation);
  
  if (!emailData) {
    console.error('Impossible de planifier le rappel : données manquantes');
    return;
  }

  if (!reservation.clubId) {
    console.error('ID du club manquant dans la réservation');
    return;
  }

  // Planifier le rappel 2 heures avant le début de la réservation
  const reminderTime = subHours(new Date(reservation.startTime), 2);

  // Créer la notification pour le pilote
  try {
    await createNotification({
      type: 'reservation_reminder',
      user_id: reservation.pilotId,
      scheduled_date: reminderTime.toISOString(),
      sent: false,
      variables: {
        PILOT_NAME: emailData.pilotName,
        AIRCRAFT: emailData.aircraftRegistration,
        START_TIME: emailData.startTime,
        END_TIME: emailData.endTime,
        FLIGHT_TYPE: emailData.flightType,
        INSTRUCTOR_NAME: emailData.instructorName || 'Aucun instructeur',
      },
      club_id: reservation.clubId,
    });

    console.log('Notification de rappel créée pour le pilote');

    // Si un instructeur est assigné, créer également une notification pour lui
    if (reservation.instructorId && emailData.instructorName && emailData.instructorEmail) {
      await createNotification({
        type: 'reservation_reminder_instructor',
        user_id: reservation.instructorId,
        scheduled_date: reminderTime.toISOString(),
        sent: false,
        variables: {
          INSTRUCTOR_NAME: emailData.instructorName,
          PILOT_NAME: emailData.pilotName,
          AIRCRAFT: emailData.aircraftRegistration,
          START_TIME: emailData.startTime,
          END_TIME: emailData.endTime,
          FLIGHT_TYPE: emailData.flightType,
        },
        club_id: reservation.clubId,
      });

      console.log('Notification de rappel créée pour l\'instructeur');
    }
  } catch (error) {
    console.error('Erreur lors de la création des notifications de rappel:', error);
    throw error;
  }
}
