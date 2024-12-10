import { Reservation } from "../types/database";
import { isFuture } from "date-fns";

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

export function validateReservation(
  startTime: Date,
  endTime: Date,
  aircraftId: string,
  pilotId: string,
  instructorId: string | null,
  reservations: Reservation[],
  currentReservationId?: string
): ValidationError | null {
  // Vérifier que le pilote est spécifié
  if (!pilotId) {
    return {
      message: "Un pilote doit être spécifié",
      code: "MISSING_PILOT",
    };
  }

  // Vérifier que la réservation est dans le futur
  const futureError = validateReservationInFuture(startTime);
  if (futureError) return futureError;

  // Vérifier les horaires de la réservation
  const timeError = validateReservationTimes(startTime, endTime);
  if (timeError) return timeError;

  // Vérifier les heures d'ouverture
  const hoursError = validateReservationHours(startTime, endTime);
  if (hoursError) return hoursError;

  // Vérifier le chevauchement avec d'autres réservations pour l'avion
  const overlapError = validateReservationOverlap(
    startTime,
    endTime,
    aircraftId,
    reservations,
    currentReservationId
  );
  if (overlapError) return overlapError;

  // Vérifier le chevauchement avec d'autres réservations pour le pilote
  const pilotOverlapError = validatePilotOverlap(
    startTime,
    endTime,
    pilotId,
    reservations,
    currentReservationId
  );
  if (pilotOverlapError) return pilotOverlapError;

  // Vérifier le chevauchement avec d'autres réservations pour l'instructeur
  const instructorOverlapError = validateInstructorOverlap(
    startTime,
    endTime,
    instructorId,
    reservations,
    currentReservationId
  );
  if (instructorOverlapError) return instructorOverlapError;

  return null;
}
