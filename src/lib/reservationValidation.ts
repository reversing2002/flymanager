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
  endTime: Date,
  club: { 
    reservation_start_hour: number | null;
    reservation_end_hour: number | null;
  }
): ValidationError | null {
  const startHour = startTime.getHours();
  const endHour = endTime.getHours();

  // Si les heures de réservation ne sont pas configurées, on utilise les valeurs par défaut
  const startLimit = club.reservation_start_hour ?? 7;
  const endLimit = club.reservation_end_hour ?? 21;

  if (startHour < startLimit || endHour > endLimit) {
    return {
      message: `Les réservations sont possibles uniquement entre ${startLimit}h et ${endLimit}h`,
      code: "OUTSIDE_RESERVATION_HOURS",
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
  console.log('Vérification disponibilité pour avion:', aircraftId);
  console.log('Période demandée:', { startTime, endTime });

  // Filtrer uniquement les indisponibilités de l'avion spécifié
  const relevantUnavailabilities = availabilities.filter(
    (a) => a.slot_type === 'unavailability' && 
          a.aircraft_id === aircraftId && 
          a.user_id === null // S'assurer que c'est une indispo avion et non utilisateur
  );

  console.log('Indisponibilités pertinentes pour avion:', relevantUnavailabilities.map(u => ({
    aircraft_id: u.aircraft_id,
    start: u.start_time,
    end: u.end_time,
    is_recurring: u.is_recurring,
    pattern: u.recurrence_pattern
  })));

  // Vérifier s'il y a un chevauchement avec une période d'indisponibilité
  const hasOverlap = relevantUnavailabilities.some((unavailability) => {
    const unavailStart = new Date(unavailability.start_time);
    const unavailEnd = new Date(unavailability.end_time);

    // Pour les indisponibilités récurrentes
    if (unavailability.is_recurring && unavailability.recurrence_pattern) {
      try {
        // Convertir la date de fin de récurrence en objet Date
        const recurrenceEndDate = unavailability.recurrence_end_date 
          ? new Date(unavailability.recurrence_end_date)
          : undefined;

        console.log('Traitement indisponibilité récurrente:', {
          pattern: unavailability.recurrence_pattern,
          start: unavailStart,
          end: unavailEnd,
          endRecurrence: recurrenceEndDate
        });

        // Créer l'objet RRule avec les options correctes
        const rruleOptions = {
          dtstart: new Date(unavailability.start_time),
          freq: RRule.WEEKLY,
          until: recurrenceEndDate
        };

        // Si le pattern contient BYDAY, ajouter les jours
        if (unavailability.recurrence_pattern.includes('BYDAY')) {
          const bydayMatch = unavailability.recurrence_pattern.match(/BYDAY=([^;]+)/);
          if (bydayMatch) {
            const days = bydayMatch[1].split(',');
            console.log('Jours récurrents trouvés:', days);
            
            const rruleDays = days.map(day => {
              switch(day) {
                case 'MO': return RRule.MO;
                case 'TU': return RRule.TU;
                case 'WE': return RRule.WE;
                case 'TH': return RRule.TH;
                case 'FR': return RRule.FR;
                case 'SA': return RRule.SA;
                case 'SU': return RRule.SU;
                default: return null;
              }
            }).filter(day => day !== null);
            
            rruleOptions.byweekday = rruleDays;
            console.log('Options RRule avec jours:', rruleOptions);
          }
        }

        const rrule = new RRule(rruleOptions);

        // Calculer la durée de l'indisponibilité en millisecondes
        const duration = unavailEnd.getTime() - unavailStart.getTime();

        // Obtenir toutes les occurrences qui pourraient chevaucher la période demandée
        const occurrences = rrule.between(
          new Date(startTime.getTime() - duration),
          endTime,
          true
        );

        console.log('Occurrences trouvées:', occurrences);

        // Vérifier chaque occurrence
        const hasRecurringOverlap = occurrences.some(occurrence => {
          const occurrenceStart = occurrence;
          const occurrenceEnd = new Date(occurrence.getTime() + duration);
          
          const overlap = (
            (startTime >= occurrenceStart && startTime < occurrenceEnd) ||
            (endTime > occurrenceStart && endTime <= occurrenceEnd) ||
            (startTime <= occurrenceStart && endTime >= occurrenceEnd)
          );

          if (overlap) {
            console.log('Chevauchement trouvé avec occurrence:', {
              start: occurrenceStart,
              end: occurrenceEnd
            });
          }

          return overlap;
        });

        if (hasRecurringOverlap) {
          console.log('Chevauchement avec indisponibilité récurrente détecté');
        }

        return hasRecurringOverlap;

      } catch (error) {
        console.error('Erreur lors du parsing de la règle de récurrence:', error);
        // En cas d'erreur de parsing, on vérifie uniquement la première occurrence
        const simpleOverlap = (
          (startTime >= unavailStart && startTime < unavailEnd) ||
          (endTime > unavailStart && endTime <= unavailEnd) ||
          (startTime <= unavailStart && endTime >= unavailEnd)
        );

        if (simpleOverlap) {
          console.log('Chevauchement avec première occurrence après erreur de parsing');
        }

        return simpleOverlap;
      }
    }
    
    // Pour les indisponibilités non récurrentes
    const simpleOverlap = (
      (startTime >= unavailStart && startTime < unavailEnd) ||
      (endTime > unavailStart && endTime <= unavailEnd) ||
      (startTime <= unavailStart && endTime >= unavailEnd)
    );

    if (simpleOverlap) {
      console.log('Chevauchement avec indisponibilité non récurrente:', {
        start: unavailStart,
        end: unavailEnd
      });
    }

    return simpleOverlap;
  });

  if (hasOverlap) {
    console.log('Indisponibilité détectée - avion non disponible');
    return {
      message: "L'avion n'est pas disponible pendant la période sélectionnée",
      code: "AIRCRAFT_UNAVAILABLE",
    };
  }

  console.log('Aucune indisponibilité détectée - avion disponible');
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
  club: { 
    reservation_start_hour: number | null;
    reservation_end_hour: number | null;
  },
  currentReservationId?: string
): ValidationError | null {
  // Validation des horaires de base
  const timeValidation = validateReservationTimes(startTime, endTime);
  if (timeValidation) return timeValidation;

  // Validation des heures d'ouverture
  const hoursValidation = validateReservationHours(startTime, endTime, club);
  if (hoursValidation) return hoursValidation;

  // Validation que la réservation est dans le futur
  const futureValidation = validateReservationInFuture(startTime);
  if (futureValidation) return futureValidation;

  // Validation du chevauchement avec d'autres réservations
  const overlapValidation = validateReservationOverlap(
    startTime,
    endTime,
    aircraftId,
    reservations,
    currentReservationId
  );
  if (overlapValidation) return overlapValidation;

  // Validation du chevauchement avec les réservations du pilote
  const pilotOverlapValidation = validatePilotOverlap(
    startTime,
    endTime,
    pilotId,
    reservations,
    currentReservationId
  );
  if (pilotOverlapValidation) return pilotOverlapValidation;

  // Validation du chevauchement avec les réservations de l'instructeur
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

  // Validation de la disponibilité de l'avion
  const availabilityValidation = validateAircraftAvailability(
    startTime,
    endTime,
    aircraftId,
    availabilities
  );
  if (availabilityValidation) return availabilityValidation;

  return null;
}
