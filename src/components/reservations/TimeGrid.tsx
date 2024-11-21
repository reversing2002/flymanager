import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  setMinutes,
  setHours,
  addMinutes,
  differenceInMinutes,
  format,
} from "date-fns";
import { Aircraft, Reservation, User } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Plane } from "lucide-react";
import { toast } from "react-hot-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fr } from "date-fns/locale";

interface TimeGridProps {
  selectedDate: Date;
  onTimeSlotClick: (start: Date, end: Date, aircraft?: Aircraft) => void;
  onReservationClick: (reservation: Reservation) => void;
  reservations: Reservation[];
  aircraft: Aircraft[];
  users: User[];
  flights: { reservationId: string }[];
  onDateChange?: (date: Date) => void;
}

const TimeGrid: React.FC<TimeGridProps> = ({
  selectedDate,
  onTimeSlotClick,
  onReservationClick,
  reservations,
  aircraft,
  users,
  flights,
  onDateChange,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const timeGridRef = useRef<HTMLDivElement>(null);
  const startHour = 7;
  const endHour = 21;
  const timeSlots = [];

  // Filtrer uniquement les appareils disponibles
  const availableAircraft = aircraft.filter((a) => a.status === "AVAILABLE");

  const cleanSelectedDate = new Date(selectedDate);
  cleanSelectedDate.setHours(0, 0, 0, 0);

  // Générer les créneaux horaires
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      timeSlots.push({ hour, minute });
    }
  }

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs((prev) => [
      ...prev,
      `${new Date().toISOString()} - ${message}`,
    ]);
  };

  const handleSlotClick = (
    hour: number,
    minute: number,
    aircraftId: string
  ) => {
    const start = setMinutes(
      setHours(new Date(cleanSelectedDate), hour),
      minute
    );
    const end = addMinutes(start, 15);

    addDebugLog(`Clicked on aircraft: ${aircraftId}`);
    onTimeSlotClick(start, end, aircraftId);
  };

  const getReservationsForAircraft = (aircraftId: string) => {
    return reservations.filter((reservation) => {
      const reservationStart = new Date(reservation.startTime);
      const reservationEnd = new Date(reservation.endTime);

      // Vérifier si la réservation chevauche la journée sélectionnée
      const dayStart = new Date(cleanSelectedDate);
      const dayEnd = new Date(cleanSelectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      console.log("Filtrage réservation:", {
        aircraftId,
        reservationId: reservation.id,
        reservationStart,
        reservationEnd,
        dayStart,
        dayEnd,
        isCorrectAircraft: reservation.aircraftId === aircraftId,
        overlapsDay:
          (reservationStart <= dayEnd && reservationStart >= dayStart) ||
          (reservationEnd <= dayEnd && reservationEnd >= dayStart) ||
          (reservationStart <= dayStart && reservationEnd >= dayEnd),
      });

      return (
        reservation.aircraftId === aircraftId &&
        ((reservationStart <= dayEnd && reservationStart >= dayStart) ||
          (reservationEnd <= dayEnd && reservationEnd >= dayStart) ||
          (reservationStart <= dayStart && reservationEnd >= dayEnd))
      );
    });
  };

  const canModifyReservation = (reservation: Reservation) => {
    return (
      user?.role === "ADMIN" ||
      user?.role === "INSTRUCTOR" ||
      reservation.userId === user?.id
    );
  };

  const handleCreateFlight = (reservation: Reservation) => {
    // Vérifier si un vol existe déjà
    const hasExistingFlight = flights.some(
      (flight) => flight.reservationId === reservation.id
    );

    if (hasExistingFlight) {
      toast.error("Un vol existe déjà pour cette réservation");
      return;
    }

    const selectedAircraft = aircraft.find(
      (a) => a.id === reservation.aircraftId
    );

    // Trouver le pilote (celui qui va voler)
    const pilot = users.find((u) => u.id === reservation.pilotId);
    const instructor = reservation.instructorId
      ? users.find((u) => u.id === reservation.instructorId)
      : undefined;

    // Calculer la durée en minutes
    const startTime = new Date(reservation.startTime);
    const endTime = new Date(reservation.endTime);
    const duration = differenceInMinutes(endTime, startTime);

    navigate("/flights/new", {
      state: {
        reservation,
        selectedAircraft,
        pilot,
        instructor,
        aircraftList: aircraft.filter((a) => a.status === "AVAILABLE"),
        users,
        fromTimeGrid: true,
        duration: duration, // Ajouter la durée calculée
        date: format(startTime, "yyyy-MM-dd"), // Ajouter la date formatée
      },
    });
  };

  const renderReservation = (reservation: Reservation) => {
    const startTime = new Date(reservation.startTime);
    const endTime = new Date(reservation.endTime);
    const duration = differenceInMinutes(endTime, startTime);
    const height = (duration / 15) * 2.5;
    const top =
      ((startTime.getHours() - startHour) * 4 + startTime.getMinutes() / 15) *
      2.5;

    // Trouver le pilote (celui qui va voler)
    const pilotInfo = users.find((u) => u.id === reservation.pilotId) || {
      firstName: "?",
      lastName: "?",
    };

    // Trouver l'instructeur si présent
    const instructorInfo = reservation.instructorId
      ? users.find((u) => u.id === reservation.instructorId)
      : null;

    const aircraftInfo = aircraft.find(
      (a) => a.id === reservation.aircraftId
    ) || { registration: "?" };

    // Vérifier si un vol existe pour cette réservation
    const hasAssociatedFlight = flights.some(
      (flight) => flight.reservationId === reservation.id
    );

    // Définir les couleurs en fonction de l'état
    let bgColor, textColor, borderColor;
    if (hasAssociatedFlight) {
      bgColor = "bg-emerald-100";
      textColor = "text-emerald-900";
      borderColor = "border-emerald-200";
    } else if (reservation.instructorId) {
      bgColor = "bg-amber-100";
      textColor = "text-amber-900";
      borderColor = "border-amber-200";
    } else {
      bgColor = "bg-sky-100";
      textColor = "text-sky-900";
      borderColor = "border-sky-200";
    }

    // Construire le nom à afficher
    const displayName =
      reservation.instructorId && instructorInfo
        ? `${pilotInfo.firstName} ${pilotInfo.lastName} (${instructorInfo.firstName})`
        : `${pilotInfo.firstName} ${pilotInfo.lastName}`;

    return (
      <div
        className={`absolute inset-x-0 mx-0.5 sm:mx-1 p-1 sm:p-2 ${bgColor} ${textColor} rounded-md text-xs overflow-hidden transition-colors shadow-sm border ${borderColor} group`}
        style={{
          height: `${height}rem`,
          top: `${top}rem`,
          zIndex: 1,
        }}
        title={`${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}
${displayName}
${aircraftInfo.registration}
${reservation.instructorId ? "Formation" : "Vol local"}`}
        onClick={() => onReservationClick(reservation)}
      >
        <div className="font-medium flex items-center justify-between">
          <span className="text-[10px] sm:text-xs">
            {format(startTime, "HH:mm")}-{format(endTime, "HH:mm")}
          </span>
          {canModifyReservation(reservation) && !hasAssociatedFlight && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateFlight(reservation);
              }}
              className="hidden group-hover:flex items-center justify-center h-5 w-5 rounded hover:bg-white/50"
              title="Créer un vol"
            >
              <Plane className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="truncate text-[10px] sm:text-xs">{displayName}</div>
        {duration >= 45 && (
          <div className="text-[10px] sm:text-xs opacity-75 truncate hidden sm:block">
            {hasAssociatedFlight
              ? "Vol créé"
              : reservation.instructorId
              ? "Formation"
              : "Vol local"}
          </div>
        )}
      </div>
    );
  };

  // Ajouter cette fonction useEffect pour le scroll initial
  useEffect(() => {
    if (timeGridRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Calculer la position de scroll
      const scrollPosition =
        ((currentHour - startHour) * 4 + currentMinute / 15) * 40; // 40px est la hauteur d'un créneau

      timeGridRef.current.scrollTop = Math.max(0, scrollPosition - 200); // 200px de décalage pour voir les créneaux précédents
    }
  }, []);

  // Ajouter cette fonction pour gérer le changement de date
  const handleDateChange = (direction: "prev" | "next") => {
    if (!onDateChange) {
      console.log("onDateChange is not defined"); // Debug
      return;
    }

    const newDate = new Date(selectedDate);
    if (direction === "next") {
      newDate.setDate(newDate.getDate() + 1);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }

    newDate.setHours(0, 0, 0, 0);

    console.log({
      direction,
      oldDate: selectedDate,
      newDate,
      onDateChange: !!onDateChange,
    }); // Debug détaillé

    onDateChange(newDate);
  };

  return (
    <div className="bg-white">
      {/* Ajouter les contrôles de navigation mobile */}
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <button
          onClick={() => handleDateChange("prev")}
          className="p-2 rounded-lg hover:bg-slate-100"
          type="button" // Ajout explicite du type
        >
          <span className="sr-only">Jour précédent</span>
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="font-medium">
            {format(selectedDate, "EEEE", { locale: fr })}
          </div>
          <div className="text-sm text-slate-500">
            {format(selectedDate, "d MMMM yyyy", { locale: fr })}
          </div>
        </div>

        <button
          onClick={() => handleDateChange("next")}
          className="p-2 rounded-lg hover:bg-slate-100"
          type="button" // Ajout explicite du type
        >
          <span className="sr-only">Jour suivant</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white overflow-x-auto">
        <div className="min-w-[800px]">
          {/* En-tête avec les avions */}
          <div className="grid grid-cols-[80px_repeat(auto-fit,minmax(140px,1fr))] border-b">
            <div className="p-4 text-sm font-medium text-slate-600 border-r sticky left-0 bg-white z-20">
              Horaire
            </div>
            {availableAircraft.map((ac) => (
              <div
                key={ac.id}
                className="p-4 text-center border-r last:border-r-0"
              >
                <div className="text-base font-medium">{ac.registration}</div>
                <div className="text-xs text-slate-500 mt-1">{ac.name}</div>
              </div>
            ))}
          </div>

          {/* Modifier cette div pour ajouter le scroll vertical */}
          <div
            ref={timeGridRef}
            className="grid grid-cols-[80px_repeat(auto-fit,minmax(140px,1fr))] max-h-[calc(100vh-200px)] overflow-y-auto"
          >
            {/* Colonne des heures */}
            <div className="border-r sticky left-0 bg-white z-10">
              {timeSlots.map(({ hour, minute }) => (
                <div
                  key={`${hour}:${minute}`}
                  className="h-10 px-4 text-sm text-slate-600 border-b last:border-b-0 flex items-center"
                >
                  {format(
                    setMinutes(setHours(new Date(), hour), minute),
                    "HH:mm"
                  )}
                </div>
              ))}
            </div>

            {/* Colonnes pour chaque avion */}
            {availableAircraft.map((ac) => (
              <div key={ac.id} className="border-r last:border-r-0 relative">
                {timeSlots.map(({ hour, minute }) => (
                  <div
                    key={`${hour}:${minute}`}
                    className="relative h-10"
                    onClick={() => handleSlotClick(hour, minute, ac.id)}
                  >
                    <div
                      className={`absolute inset-0 border-b border-r border-l border-slate-200
                        ${
                          minute === 0
                            ? "border-b-slate-300"
                            : "border-b-slate-200"
                        }
                        ${hour % 2 === 0 ? "bg-white" : "bg-slate-50/30"}
                        hover:bg-slate-50 transition-colors`}
                    />
                  </div>
                ))}
                {getReservationsForAircraft(ac.id).map((reservation) => (
                  <div
                    key={reservation.id}
                    className={`${
                      canModifyReservation(reservation)
                        ? "cursor-pointer"
                        : "cursor-default"
                    }`}
                  >
                    {renderReservation(reservation)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeGrid;
