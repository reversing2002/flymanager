import { Reservation } from "../types/database";
import { isFuture, parseISO } from "date-fns";
import { RRule, RRuleSet, rrulestr } from "rrule/dist/esm/index.js";

export interface ValidationError {
  message: string;
  code: string;
}

export function validateReservationTimes(
  startTime: Date,
  endTime: Date
): ValidationError | null {
  // Vérifier que l'heure de fin est après l'heure de début
  if (startTime >= endTime) {
    return {
      message: "L'heure de fin doit être après l'heure de début",
      code: "INVALID_TIME_ORDER",
    };
  }

  // Vérifier la durée minimale (15 minutes)
  const minDuration = 15;
  const durationInMinutes =
    (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  if (durationInMinutes < minDuration) {
    return {
      message: "La durée minimale de réservation est de 15 minutes",
      code: "DURATION_TOO_SHORT",
    };
  }

  // Vérifier la durée maximale (12 heures)
  const maxDuration = 12 * 60;
  if (durationInMinutes > maxDuration) {
    return {
      message: "La durée maximale de réservation est de 12 heures",
      code: "DURATION_TOO_LONG",
    };
  }

  return null;
}

export function validateReservationOverlap(
  startTime: Date,
  endTime: Date,
  aircraftId: string,
  existingReservations: Reservation[],
  excludeReservationId?: string
): ValidationError | null {
  const overlappingReservation = existingReservations.find((reservation) => {
    // Ignorer la réservation en cours de modification
    if (excludeReservationId && reservation.id === excludeReservationId) {
      return false;
    }

    // Vérifier uniquement les réservations pour le même avion
    if (reservation.aircraftId !== aircraftId) {
      return false;
    }

    // Convertir les dates de string en Date
    const reservationStart = new Date(reservation.startTime);
    const reservationEnd = new Date(reservation.endTime);

    // Vérifier le chevauchement
    return (
      (startTime >= reservationStart && startTime < reservationEnd) || // Le début est pendant une autre réservation
      (endTime > reservationStart && endTime <= reservationEnd) || // La fin est pendant une autre réservation
      (startTime <= reservationStart && endTime >= reservationEnd) // La réservation englobe une autre
    );
  });

  if (overlappingReservation) {
    return {
      message:
        "Cette période chevauche une réservation existante pour cet appareil",
      code: "OVERLAPPING_RESERVATION",
    };
  }

  return null;
}

export function validateReservationInFuture(
  startTime: Date
): ValidationError | null {
  if (!isFuture(startTime)) {
    return {
      message: "La réservation doit être dans le futur",
      code: "PAST_RESERVATION",
    };
  }

  return null;
}

export function validateReservationHours(
  startTime: Date,
  endTime: Date
): ValidationError | null {
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();

  // Vérifier les heures d'ouverture (7h00 - 21h00)
  if (startHour < 7 || endHour > 21) {
    return {
      message: "Les réservations sont possibles uniquement entre 7h00 et 21h00",
      code: "OUTSIDE_OPERATING_HOURS",
    };
  }

  return null;
}

export function validatePilotOverlap(
  startTime: Date,
  endTime: Date,
  pilotId: string,
  existingReservations: Reservation[],
  excludeReservationId?: string
): ValidationError | null {
  const overlappingReservation = existingReservations.find((reservation) => {
    // Ignorer la réservation en cours de modification
    if (excludeReservationId && reservation.id === excludeReservationId) {
      return false;
    }

    // Vérifier si le pilote est impliqué dans une autre réservation
    if (reservation.pilotId !== pilotId) {
      return false;
    }

    // Convertir les dates de string en Date
    const reservationStart = new Date(reservation.startTime);
    const reservationEnd = new Date(reservation.endTime);

    // Vérifier le chevauchement, même si c'est sur un avion différent
    return (
      (startTime >= reservationStart && startTime < reservationEnd) ||
      (endTime > reservationStart && endTime <= reservationEnd) ||
      (startTime <= reservationStart && endTime >= reservationEnd)
    );
  });

  if (overlappingReservation) {
    return {
      message:
        "Un pilote ne peut pas avoir plusieurs réservations simultanées, même sur des avions différents",
      code: "PILOT_OVERLAP",
    };
  }

  return null;
}

export function validateInstructorOverlap(
  startTime: Date,
  endTime: Date,
  instructorId: string | null,
  existingReservations: Reservation[],
  excludeReservationId?: string
): ValidationError | null {
  if (!instructorId) return null;

  const overlappingReservation = existingReservations.find((reservation) => {
    // Ignorer la réservation en cours de modification
    if (excludeReservationId && reservation.id === excludeReservationId) {
      return false;
    }

    // Vérifier si l'instructeur est impliqué dans une autre réservation
    if (reservation.instructorId !== instructorId) {
      return false;
    }

    // Convertir les dates de string en Date
    const reservationStart = new Date(reservation.startTime);
    const reservationEnd = new Date(reservation.endTime);

    // Vérifier le chevauchement
    return (
      (startTime >= reservationStart && startTime < reservationEnd) || // Le début est pendant une autre réservation
      (endTime > reservationStart && endTime <= reservationEnd) || // La fin est pendant une autre réservation
      (startTime <= reservationStart && endTime >= reservationEnd) // La réservation englobe une autre
    );
  });

  if (overlappingReservation) {
    return {
      message: "L'instructeur a déjà une réservation sur cette période",
      code: "INSTRUCTOR_OVERLAP",
    };
  }

  return null;
}

export function validateAircraftAvailability(
  startTime: Date,
  endTime: Date,
  aircraftId: string,
  availabilities: Availability[]
): ValidationError | null {
  // Filtrer les indisponibilités pour l'avion spécifié ou globales
  const relevantUnavailabilities = availabilities.filter(
    (a) => a.slot_type === 'unavailability' && 
          (a.aircraft_id === aircraftId || a.aircraft_id === null)
  );

  // Vérifier s'il y a un chevauchement avec une période d'indisponibilité
  const hasOverlap = relevantUnavailabilities.some((unavailability) => {
    const unavailStart = new Date(unavailability.start_time);
    const unavailEnd = new Date(unavailability.end_time);

    // Pour les indisponibilités récurrentes
    if (unavailability.is_recurring && unavailability.recurrence_pattern) {
      try {
        const rrule = rrulestr(unavailability.recurrence_pattern, {
          dtstart: parseISO(unavailability.start_time),
          until: unavailability.recurrence_end_date ? parseISO(unavailability.recurrence_end_date) : undefined
        });

        // Calculer la durée de l'indisponibilité en millisecondes
        const duration = new Date(unavailability.end_time).getTime() - new Date(unavailability.start_time).getTime();

        // Obtenir toutes les occurrences qui pourraient chevaucher la période demandée
        const occurrences = rrule.between(
          new Date(startTime.getTime() - duration), // Rechercher un peu avant
          endTime,
          true
        );

        // Vérifier chaque occurrence
        return occurrences.some(occurrence => {
          const occurrenceStart = occurrence;
          const occurrenceEnd = new Date(occurrence.getTime() + duration);
          
          return (
            (startTime >= occurrenceStart && startTime < occurrenceEnd) ||
            (endTime > occurrenceStart && endTime <= occurrenceEnd) ||
            (startTime <= occurrenceStart && endTime >= occurrenceEnd)
          );
        });
      } catch (error) {
        console.error('Erreur lors du parsing de la règle de récurrence:', error);
        // En cas d'erreur de parsing, on vérifie uniquement la première occurrence
        return (
          (startTime >= unavailStart && startTime < unavailEnd) ||
          (endTime > unavailStart && endTime <= unavailEnd) ||
          (startTime <= unavailStart && endTime >= unavailEnd)
        );
      }
    }
    
    // Pour les indisponibilités non récurrentes
    return (
      (startTime >= unavailStart && startTime < unavailEnd) ||
      (endTime > unavailStart && endTime <= unavailEnd) ||
      (startTime <= unavailStart && endTime >= unavailEnd)
    );
  });

  if (hasOverlap) {
    return {
      message: "L'avion n'est pas disponible pendant la période sélectionnée",
      code: "AIRCRAFT_UNAVAILABLE",
    };
  }

  return null;
}

export function validateReservation(
  startTime: Date,
  endTime: Date,
  aircraftId: string,
  pilotId: string,
  instructorId: string | null,
  reservations: Reservation[],
  availabilities: Availability[],
  currentReservationId?: string
): ValidationError | null {
  // Validation des horaires de base
  const timeValidation = validateReservationTimes(startTime, endTime);
  if (timeValidation) return timeValidation;

  // Validation des heures d'ouverture
  const hoursValidation = validateReservationHours(startTime, endTime);
  if (hoursValidation) return hoursValidation;

  // Validation que la réservation est dans le futur
  const futureValidation = validateReservationInFuture(startTime);
  if (futureValidation) return futureValidation;

  // Validation des chevauchements de réservations
  const overlapValidation = validateReservationOverlap(
    startTime,
    endTime,
    aircraftId,
    reservations,
    currentReservationId
  );
  if (overlapValidation) return overlapValidation;

  // Validation des disponibilités de l'avion
  const availabilityValidation = validateAircraftAvailability(
    startTime,
    endTime,
    aircraftId,
    availabilities
  );
  if (availabilityValidation) return availabilityValidation;

  // Validation des chevauchements pour le pilote
  const pilotOverlapValidation = validatePilotOverlap(
    startTime,
    endTime,
    pilotId,
    reservations,
    currentReservationId
  );
  if (pilotOverlapValidation) return pilotOverlapValidation;

  // Validation des chevauchements pour l'instructeur si présent
  if (instructorId) {
    const instructorOverlapValidation = validateInstructorOverlap(
      startTime,
      endTime,
      instructorId,
      reservations,
      currentReservationId
    );
    if (instructorOverlapValidation) return instructorOverlapValidation;
  }

  return null;
}
