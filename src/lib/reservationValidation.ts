import { Reservation } from "../types/database";
import { areIntervalsOverlapping, isFuture } from "date-fns";

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

    // Vérifier le chevauchement des intervalles
    return areIntervalsOverlapping(
      {
        start: new Date(reservation.startTime),
        end: new Date(reservation.endTime),
      },
      { start: startTime, end: endTime }
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

export const validateReservation = (
  startTime: Date,
  endTime: Date,
  aircraftId: string,
  reservations: Reservation[],
  currentReservationId?: string
) => {
  console.log("Début de validation pour la réservation:", currentReservationId);

  if (startTime >= endTime) {
    return {
      message: "La date de fin doit être postérieure à la date de début",
    };
  }

  // Filtrer d'abord les réservations pertinentes
  const relevantReservations = reservations.filter((reservation) => {
    // Exclure la réservation en cours de modification
    if (currentReservationId && reservation.id === currentReservationId) {
      console.log("Exclusion de la réservation courante:", reservation.id);
      return false;
    }

    // Ne garder que les réservations pour le même appareil
    if (reservation.aircraftId !== aircraftId) {
      console.log("Exclusion d'un appareil différent:", reservation.aircraftId);
      return false;
    }

    return true;
  });

  console.log("Réservations à vérifier après filtrage:", relevantReservations);

  // Vérifier les chevauchements
  for (const reservation of relevantReservations) {
    const existingStart = new Date(reservation.startTime);
    const existingEnd = new Date(reservation.endTime);

    const hasOverlap =
      (startTime >= existingStart && startTime < existingEnd) ||
      (endTime > existingStart && endTime <= existingEnd) ||
      (startTime <= existingStart && endTime >= existingEnd);

    if (hasOverlap) {
      console.log("Chevauchement trouvé avec:", {
        reservationId: reservation.id,
        period: `${existingStart.toISOString()} - ${existingEnd.toISOString()}`,
      });
      return {
        message:
          "Cette période chevauche une réservation existante pour cet appareil",
      };
    }
  }

  return null;
};
