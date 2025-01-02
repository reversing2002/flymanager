import { supabase } from '../lib/supabase';
import { createNotification, getNotificationTemplate, sendEmail, getNotificationSettings } from './notificationService';
import type { Reservation } from '../types/database';
import { addHours, subHours, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types de notifications
export const NOTIFICATION_TYPES = {
  PILOT_CONFIRMATION: 'reservation_confirmation',
  INSTRUCTOR_CONFIRMATION: 'reservation_confirmation_instructor',
  PILOT_REMINDER: 'reservation_reminder',
  INSTRUCTOR_REMINDER: 'reservation_reminder_instructor',
  PILOT_MODIFICATION: 'reservation_modification',
  INSTRUCTOR_MODIFICATION: 'reservation_modification_instructor',
  PILOT_CANCELLATION: 'reservation_cancellation',
  INSTRUCTOR_CANCELLATION: 'reservation_cancellation_instructor'
} as const;

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

// Fonction pour convertir UTC en heure locale et formater
function formatLocalDateTime(utcDateString: string): string {
  const date = parseISO(utcDateString);
  return format(date, "d MMMM yyyy 'à' HH'h'mm", { locale: fr });
}

async function getReservationEmailData(reservation: Reservation): Promise<ReservationEmailData | null> {
  try {
    console.log('Récupération des données pour l\'email de réservation:', reservation);
    console.log('Données brutes de la réservation:', JSON.stringify(reservation, null, 2));
    console.log('Format snake_case:', {
      pilot_id: reservation.pilot_id,
      user_id: reservation.user_id,
      instructor_id: reservation.instructor_id,
      aircraft_id: reservation.aircraft_id,
      flight_type_id: reservation.flight_type_id,
      club_id: reservation.club_id,
      start_time: reservation.start_time,
      end_time: reservation.end_time
    });
    console.log('Format camelCase:', {
      pilotId: (reservation as any).pilotId,
      userId: (reservation as any).userId,
      instructorId: (reservation as any).instructorId,
      aircraftId: (reservation as any).aircraftId,
      flightTypeId: (reservation as any).flightTypeId,
      clubId: (reservation as any).clubId,
      startTime: (reservation as any).startTime,
      endTime: (reservation as any).endTime
    });

    // Support both camelCase and snake_case formats
    const pilotId = reservation.pilot_id || (reservation as any).pilotId;
    const userId = reservation.user_id || (reservation as any).userId;
    const instructorId = reservation.instructor_id || (reservation as any).instructorId;
    const aircraftId = reservation.aircraft_id || (reservation as any).aircraftId;
    const flightTypeId = reservation.flight_type_id || (reservation as any).flightTypeId;
    const clubId = reservation.club_id || (reservation as any).clubId;

    if (!pilotId && !userId) {
      console.error('ID du pilote et ID de l\'utilisateur manquants dans la réservation');
      return null;
    }

    // Récupérer les informations du pilote
    const { data: pilot, error: pilotError } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', pilotId || userId)
      .single();

    if (pilotError || !pilot) {
      console.error('Erreur lors de la récupération des informations du pilote:', pilotError);
      return null;
    }

    // Récupérer les informations de l'instructeur si présent
    let instructor = null;
    if (instructorId) {
      console.log('Récupération des informations de l\'instructeur:', instructorId);
      const { data: instructorData, error: instructorError } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', instructorId)
        .single();
      
      if (instructorError) {
        console.error('Erreur lors de la récupération des informations de l\'instructeur:', instructorError);
      } else {
        instructor = instructorData;
      }
    }

    if (!aircraftId) {
      console.error('ID de l\'avion manquant dans la réservation');
      return null;
    }

    // Récupérer les informations de l'avion
    const { data: aircraft, error: aircraftError } = await supabase
      .from('aircraft')
      .select('registration')
      .eq('id', aircraftId)
      .single();

    if (aircraftError || !aircraft) {
      console.error('Erreur lors de la récupération des informations de l\'avion:', aircraftError);
      return null;
    }

    if (!flightTypeId) {
      console.error('ID du type de vol manquant dans la réservation');
      return null;
    }

    // Récupérer le type de vol
    const { data: flightType, error: flightTypeError } = await supabase
      .from('flight_types')
      .select('name')
      .eq('id', flightTypeId)
      .single();

    if (flightTypeError || !flightType) {
      console.error('Erreur lors de la récupération du type de vol:', flightTypeError);
      return null;
    }

    // Convertir les heures UTC en heures locales et formater
    const formattedStartTime = formatLocalDateTime(reservation.start_time || (reservation as any).startTime);
    const formattedEndTime = formatLocalDateTime(reservation.end_time || (reservation as any).endTime);

    const emailData = {
      pilotName: `${pilot.first_name} ${pilot.last_name}`,
      pilotEmail: pilot.email,
      instructorName: instructor ? `${instructor.first_name} ${instructor.last_name}` : undefined,
      instructorEmail: instructor?.email,
      aircraftRegistration: aircraft.registration,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
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
  console.log('Données de la réservation (confirmation):', JSON.stringify(reservation, null, 2));
  
  const emailData = await getReservationEmailData(reservation);
  
  if (!emailData) {
    console.error('Impossible d\'envoyer l\'email de confirmation : données manquantes');
    return;
  }

  if (!reservation.club_id && !(reservation as any).clubId) {
    console.error('ID du club manquant dans la réservation');
    return;
  }
  
  // Créer la notification pour le pilote
  try {
    await createNotification({
      type: NOTIFICATION_TYPES.PILOT_CONFIRMATION,
      user_id: reservation.pilot_id || (reservation as any).pilotId || reservation.user_id || (reservation as any).userId,
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
      club_id: reservation.club_id || (reservation as any).clubId,
    });

    console.log('Notification de confirmation créée pour le pilote');

    // Si un instructeur est assigné, créer une notification pour lui aussi
    if ((reservation.instructor_id || (reservation as any).instructorId) && emailData.instructorName && emailData.instructorEmail) {
      await createNotification({
        type: NOTIFICATION_TYPES.INSTRUCTOR_CONFIRMATION,
        user_id: reservation.instructor_id || (reservation as any).instructorId,
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
        club_id: reservation.club_id || (reservation as any).clubId,
      });
      console.log('Notification de confirmation créée pour l\'instructeur');
    }
  } catch (error) {
    console.error('Erreur lors de la création des notifications de confirmation:', error);
  }
}

export async function scheduleReservationReminder(reservation: Reservation): Promise<void> {
  console.log('Planification du rappel de réservation');
  console.log('Données de la réservation (rappel):', JSON.stringify(reservation, null, 2));

  // Vérifier si la réservation est dans moins de 2 heures
  const reservationTime = new Date(reservation.start_time || (reservation as any).startTime);
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

  if (!reservation.club_id && !(reservation as any).clubId) {
    console.error('ID du club manquant dans la réservation');
    return;
  }

  // Planifier le rappel 2 heures avant le début de la réservation
  const reminderTime = subHours(new Date(reservation.start_time || (reservation as any).startTime), 2);

  // Créer la notification pour le pilote
  try {
    await createNotification({
      type: NOTIFICATION_TYPES.PILOT_REMINDER,
      user_id: reservation.pilot_id || (reservation as any).pilotId || reservation.user_id || (reservation as any).userId,
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
      club_id: reservation.club_id || (reservation as any).clubId,
    });

    console.log('Notification de rappel créée pour le pilote');

    // Si un instructeur est assigné, créer également une notification pour lui
    if ((reservation.instructor_id || (reservation as any).instructorId) && emailData.instructorName && emailData.instructorEmail) {
      await createNotification({
        type: NOTIFICATION_TYPES.INSTRUCTOR_REMINDER,
        user_id: reservation.instructor_id || (reservation as any).instructorId,
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
        club_id: reservation.club_id || (reservation as any).clubId,
      });

      console.log('Notification de rappel créée pour l\'instructeur');
    }
  } catch (error) {
    console.error('Erreur lors de la création des notifications de rappel:', error);
    throw error;
  }
}

export async function sendReservationModification(reservation: Reservation, changes: Partial<Reservation>): Promise<void> {
  try {
    console.log('Envoi de la notification de modification');
    console.log('Données de la réservation (modification):', JSON.stringify(reservation, null, 2));
    console.log('Changements:', JSON.stringify(changes, null, 2));
    
    const emailData = await getReservationEmailData(reservation);
    if (!emailData) return;

    const clubId = reservation.club_id || (reservation as any).clubId;
    if (!clubId) {
      console.error('ID du club manquant dans la réservation');
      return;
    }

    // Créer la notification pour le pilote
    await createNotification({
      type: NOTIFICATION_TYPES.PILOT_MODIFICATION,
      user_id: reservation.pilot_id || (reservation as any).pilotId || reservation.user_id || (reservation as any).userId,
      scheduled_date: new Date().toISOString(),
      sent: false,
      variables: {
        PILOT_NAME: emailData.pilotName,
        AIRCRAFT: emailData.aircraftRegistration,
        FLIGHT_TYPE: emailData.flightType,
        START_TIME: emailData.startTime,
        END_TIME: emailData.endTime,
        INSTRUCTOR_NAME: emailData.instructorName || '',
        CHANGES: formatChangesForEmail(changes)
      },
      club_id: clubId
    });

    // Si un instructeur est assigné, créer une notification pour lui aussi
    if ((reservation.instructor_id || (reservation as any).instructorId) && emailData.instructorEmail) {
      await createNotification({
        type: NOTIFICATION_TYPES.INSTRUCTOR_MODIFICATION,
        user_id: reservation.instructor_id || (reservation as any).instructorId,
        scheduled_date: new Date().toISOString(),
        sent: false,
        variables: {
          PILOT_NAME: emailData.pilotName,
          AIRCRAFT: emailData.aircraftRegistration,
          FLIGHT_TYPE: emailData.flightType,
          START_TIME: emailData.startTime,
          END_TIME: emailData.endTime,
          INSTRUCTOR_NAME: emailData.instructorName,
          CHANGES: formatChangesForEmail(changes)
        },
        club_id: clubId
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications de modification:', error);
  }
}

function formatChangesForEmail(changes: Partial<Reservation>): string {
  const formattedChanges: string[] = [];

  if (changes.startTime || changes.start_time) {
    formattedChanges.push(`Nouvelle heure de début : ${formatLocalDateTime(changes.startTime || changes.start_time)}`);
  }
  if (changes.endTime || changes.end_time) {
    formattedChanges.push(`Nouvelle heure de fin : ${formatLocalDateTime(changes.endTime || changes.end_time)}`);
  }
  if (changes.aircraftId || changes.aircraft_id) {
    formattedChanges.push(`Nouvel avion : ${changes.aircraftId || changes.aircraft_id}`);
  }
  if (changes.instructorId || changes.instructor_id) {
    formattedChanges.push(`Nouvel instructeur : ${changes.instructorId || changes.instructor_id}`);
  }
  if (changes.flightTypeId || changes.flight_type_id) {
    formattedChanges.push(`Nouveau type de vol : ${changes.flightTypeId || changes.flight_type_id}`);
  }
  if (changes.withInstructor || changes.with_instructor) {
    formattedChanges.push(`Avec instructeur : ${changes.withInstructor || changes.with_instructor}`);
  }
  if (changes.comments || changes.comments) {
    formattedChanges.push(`Commentaires : ${changes.comments || changes.comments}`);
  }

  return formattedChanges.join('\n');
}

export async function sendReservationCancellation(reservation: Reservation): Promise<void> {
  try {
    console.log('Envoi de la notification d\'annulation');
    console.log('Données de la réservation (annulation):', JSON.stringify(reservation, null, 2));
    
    const emailData = await getReservationEmailData(reservation);
    if (!emailData) return;

    const clubId = reservation.club_id || (reservation as any).clubId;
    if (!clubId) {
      console.error('ID du club manquant dans la réservation');
      return;
    }

    // Créer la notification pour le pilote
    await createNotification({
      type: NOTIFICATION_TYPES.PILOT_CANCELLATION,
      user_id: reservation.pilot_id || (reservation as any).pilotId || reservation.user_id || (reservation as any).userId,
      scheduled_date: new Date().toISOString(),
      sent: false,
      variables: {
        PILOT_NAME: emailData.pilotName,
        AIRCRAFT: emailData.aircraftRegistration,
        FLIGHT_TYPE: emailData.flightType,
        START_TIME: emailData.startTime,
        END_TIME: emailData.endTime,
        INSTRUCTOR_NAME: emailData.instructorName || ''
      },
      club_id: clubId
    });

    // Si un instructeur est assigné, créer une notification pour lui aussi
    if ((reservation.instructor_id || (reservation as any).instructorId) && emailData.instructorEmail) {
      await createNotification({
        type: NOTIFICATION_TYPES.INSTRUCTOR_CANCELLATION,
        user_id: reservation.instructor_id || (reservation as any).instructorId,
        scheduled_date: new Date().toISOString(),
        sent: false,
        variables: {
          PILOT_NAME: emailData.pilotName,
          AIRCRAFT: emailData.aircraftRegistration,
          FLIGHT_TYPE: emailData.flightType,
          START_TIME: emailData.startTime,
          END_TIME: emailData.endTime,
          INSTRUCTOR_NAME: emailData.instructorName
        },
        club_id: clubId
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications d\'annulation:', error);
  }
}
