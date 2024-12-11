import React, { useState, useRef, useEffect } from "react";
import { setMinutes, setHours, differenceInMinutes, format } from "date-fns";
import { Aircraft, Reservation, User } from "../../types/database";
import { useAuth } from "../../contexts/AuthContext";
import { Plane, Moon } from "lucide-react";
import ReservationModal from "./ReservationModal";
import { getSunTimes } from "../../lib/sunTimes";
import { supabase } from "../../lib/supabase";

interface TimeGridProps {
  selectedDate: Date;
  onTimeSlotClick: (start: Date, end: Date, aircraft?: Aircraft) => void;
  onReservationClick: (reservation: Reservation) => void;
  onReservationUpdate: (reservation: Reservation) => void;
  reservations: Reservation[];
  aircraft: Aircraft[];
  aircraftOrder?: { [key: string]: number };
  onAircraftOrderChange?: (newOrder: { [key: string]: number }) => void;
  users: User[];
  flights: { reservationId: string }[];
  onDateChange?: (date: Date) => void;
  nightFlightsEnabled: boolean;
}

const TimeGrid: React.FC<TimeGridProps> = ({
  selectedDate,
  onTimeSlotClick,
  onReservationClick,
  onReservationUpdate,
  reservations,
  aircraft,
  aircraftOrder,
  onAircraftOrderChange,
  users,
  flights,
  onDateChange,
  nightFlightsEnabled,
}) => {
  const { user } = useAuth();
  const [clubCoordinates, setClubCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    const loadClubCoordinates = async () => {
      if (!user?.club?.id) return;

      const { data: clubData } = await supabase
        .from("clubs")
        .select("latitude, longitude")
        .eq("id", user.club.id)
        .single();

      if (clubData?.latitude && clubData?.longitude) {
        setClubCoordinates(clubData);
      }
    };

    loadClubCoordinates();
  }, [user?.club?.id]);

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    hour: number;
    minute: number;
    aircraftId: string;
  } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{
    hour: number;
    minute: number;
  } | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<{
    reservation: Reservation;
    startTime: Date;
    endTime: Date;
    aircraftId: string;
  } | null>(null);
  const timeGridRef = useRef<HTMLDivElement>(null);
  const hoursColumnRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const startHour = 7;
  const endHour = 21;

  // Modifier la génération des créneaux horaires en fonction des heures aéronautiques
  const generateTimeSlots = () => {
    if (!clubCoordinates) {
      // Valeurs par défaut si pas de coordonnées
      const defaultStartHour = 7;
      const defaultEndHour = nightFlightsEnabled ? 21 : 18;
      return generateSlotsForHours(defaultStartHour, defaultEndHour);
    }

    const sunTimes = getSunTimes(
      selectedDate,
      clubCoordinates.latitude,
      clubCoordinates.longitude
    );

    // Utiliser les minutes pour plus de précision
    const startMinutes =
      sunTimes.aeroStart.getHours() * 60 + sunTimes.aeroStart.getMinutes();
    const endMinutes =
      sunTimes.aeroEnd.getHours() * 60 + sunTimes.aeroEnd.getMinutes();

    // Arrondir au quart d'heure inférieur pour le début
    const roundedStartMinutes = Math.floor(startMinutes / 15) * 15;
    // Arrondir au quart d'heure supérieur pour la fin
    const roundedEndMinutes = Math.ceil(endMinutes / 15) * 15;

    const startHour = Math.floor(roundedStartMinutes / 60);
    const endHour = Math.ceil(roundedEndMinutes / 60);

    console.log("=== Debug Time Slots Generation ===");
    console.log("Aero start:", sunTimes.aeroStart.toLocaleTimeString());
    console.log("Aero end:", sunTimes.aeroEnd.toLocaleTimeString());
    console.log("Rounded start hour:", startHour);
    console.log("Rounded end hour:", endHour);

    return generateSlotsForHours(
      startHour,
      nightFlightsEnabled ? endHour + 1 : endHour
    );
  };

  const generateSlotsForHours = (startHour: number, endHour: number) => {
    return Array.from({ length: (endHour - startHour) * 4 }, (_, i) => {
      const hour = Math.floor(i / 4) + startHour;
      const minute = (i % 4) * 15;
      return { hour, minute };
    });
  };

  // Remplacer la constante TIME_SLOTS par un state
  const [timeSlots, setTimeSlots] = useState(generateTimeSlots());

  // Mettre à jour les créneaux quand les dépendances changent
  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, [selectedDate, clubCoordinates, nightFlightsEnabled]);

  // Filter only available aircraft
  const availableAircraft = aircraft.filter((a) => a.status === "AVAILABLE");

  // Sort aircraft according to their order
  const sortedAircraft = [...availableAircraft].sort((a, b) => {
    const positionA = aircraftOrder?.[a.id] ?? Infinity;
    const positionB = aircraftOrder?.[b.id] ?? Infinity;
    return positionA - positionB;
  });

  const cleanSelectedDate = new Date(selectedDate);
  cleanSelectedDate.setHours(0, 0, 0, 0);

  // Ajouter un gestionnaire global pour le mouseup
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleClick = (hour: number, minute: number, aircraftId: string) => {
    const start = new Date(selectedDate);
    start.setHours(hour, minute, 0, 0);
    
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 60); // Par défaut 1h de réservation
    
    onTimeSlotClick(start, end, aircraftId);
    // Réinitialiser l'état de sélection
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleMouseDown = (
    hour: number,
    minute: number,
    aircraftId: string,
    event: React.MouseEvent
  ) => {
    // Si c'est un clic simple, on gère avec handleClick
    if (event.type === "mousedown") {
      const handler = setTimeout(() => {
        setIsSelecting(true);
        setSelectionStart({ hour, minute, aircraftId });
      }, 200); // Délai court pour différencier clic et glisser

      // Stocke le handler pour pouvoir l'annuler si besoin
      return handler;
    }
  };

  const handleMouseMove = (hour: number, minute: number) => {
    if (isSelecting) {
      setSelectionEnd({ hour, minute });
    }
  };

  const handleMouseUp = (event: React.MouseEvent, timeoutHandler?: NodeJS.Timeout) => {
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
    }
    
    if (!isSelecting && selectionStart === null) {
      // C'était un clic simple
      const target = event.currentTarget as HTMLElement;
      const [hour, minute] = target.getAttribute("data-time")?.split("-").map(Number) || [0, 0];
      const aircraftId = target.getAttribute("data-aircraft") || "";
      handleClick(hour, minute, aircraftId);
      return;
    }

    if (isSelecting && selectionStart && selectionEnd) {
      const start = new Date(selectedDate);
      start.setHours(selectionStart.hour, selectionStart.minute, 0, 0);

      const end = new Date(selectedDate);
      // Arrondir à l'intervalle de 15 minutes supérieur et ajouter 15 minutes
      const endMinutes = selectionEnd.hour * 60 + selectionEnd.minute;
      const roundedEndMinutes = Math.ceil(endMinutes / 15) * 15 + 15;
      const endHour = Math.floor(roundedEndMinutes / 60);
      const endMinute = roundedEndMinutes % 60;
      end.setHours(endHour, endMinute, 0, 0);

      if (end > start) {
        onTimeSlotClick(start, end, selectionStart.aircraftId);
      } else {
        // Si on fait un drag vers le haut, on inverse start et end
        const adjustedStart = new Date(selectedDate);
        // Arrondir à l'intervalle de 15 minutes inférieur
        const startMinutes = selectionEnd.hour * 60 + selectionEnd.minute;
        const roundedStartMinutes = Math.floor(startMinutes / 15) * 15;
        const startHour = Math.floor(roundedStartMinutes / 60);
        const startMinute = roundedStartMinutes % 60;
        adjustedStart.setHours(startHour, startMinute, 0, 0);

        // Ajouter 15 minutes à l'heure de fin (qui était l'heure de début)
        const adjustedEnd = new Date(start);
        adjustedEnd.setMinutes(adjustedEnd.getMinutes() + 15);

        onTimeSlotClick(adjustedStart, adjustedEnd, selectionStart.aircraftId);
      }
    }

    // Réinitialiser l'état de sélection dans tous les cas
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const isSlotSelected = (hour: number, minute: number, aircraftId: string) => {
    if (!selectionStart || !selectionEnd) return false;

    const startMinutes = selectionStart.hour * 60 + selectionStart.minute;
    const endMinutes = selectionEnd.hour * 60 + selectionEnd.minute;
    const slotMinutes = hour * 60 + minute;

    return (
      aircraftId === selectionStart.aircraftId &&
      slotMinutes >= startMinutes &&
      slotMinutes <= endMinutes
    );
  };

  const getReservationsForAircraft = (aircraftId: string) => {
    return reservations.filter((reservation) => {
      const reservationStart = new Date(reservation.startTime);
      const reservationEnd = new Date(reservation.endTime);
      const dayStart = new Date(cleanSelectedDate);
      const dayEnd = new Date(cleanSelectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      return (
        reservation.aircraftId === aircraftId &&
        ((reservationStart <= dayEnd && reservationStart >= dayStart) ||
          (reservationEnd <= dayEnd && reservationEnd >= dayStart) ||
          (reservationStart <= dayStart && reservationEnd >= dayEnd))
      );
    });
  };

  const renderReservation = (reservation: Reservation) => {
    const startTime = new Date(reservation.startTime);
    const endTime = new Date(reservation.endTime);
    const duration = differenceInMinutes(endTime, startTime);
    const height = (duration / 15) * 1;
    const top =
      ((startTime.getHours() - startHour) * 4 + startTime.getMinutes() / 15) *
      1;

    const pilot = users.find((u) => u.id === reservation.pilotId);
    const hasAssociatedFlight = flights.some(
      (f) => f.reservationId === reservation.id
    );

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

    return (
      <div
        key={reservation.id}
        className={`absolute inset-x-0 mx-0.5 sm:mx-1 ${bgColor} ${textColor} rounded-md text-xs overflow-hidden transition-colors shadow-sm border ${borderColor} hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer`}
        style={{
          height: `${height}rem`,
          top: `${top}rem`,
        }}
        onClick={() => onReservationClick(reservation)}
      >
        <div className="p-1 sm:p-2">
          <div className="font-medium">
            {format(startTime, "H'h'")} - {format(endTime, "H'h'")}
          </div>
          <div className="mt-1 line-clamp-2">
            {pilot ? pilot.first_name : "Pilote inconnu"}
            {reservation.instructorId && (
              <>
                {" + "}
                {users.find((u) => u.id === reservation.instructorId)
                  ?.first_name || "Instructeur inconnu"}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getSelectionTimes = () => {
    if (!selectionStart || !selectionEnd) return null;

    let startHour = selectionStart.hour;
    let startMinute = selectionStart.minute;

    const endMinutes = selectionEnd.hour * 60 + selectionEnd.minute;
    const roundedEndMinutes = Math.ceil(endMinutes / 15) * 15 + 15;
    const endHour = Math.floor(roundedEndMinutes / 60);
    const endMinute = roundedEndMinutes % 60;

    if (endHour * 60 + endMinute < startHour * 60 + startMinute) {
      // Si on fait un drag vers le haut
      const startMinutes = selectionEnd.hour * 60 + selectionEnd.minute;
      const roundedStartMinutes = Math.floor(startMinutes / 15) * 15;
      startHour = Math.floor(roundedStartMinutes / 60);
      startMinute = roundedStartMinutes % 60;
    }

    return {
      startTime: `${startHour}h${startMinute > 0 ? startMinute : ""}`,
      endTime: `${endHour}h${endMinute > 0 ? endMinute : ""}`,
    };
  };

  const isNightTime = (hour: number, minute: number) => {
    if (!clubCoordinates) return false;

    const slotTime = setMinutes(setHours(new Date(selectedDate), hour), minute);
    const sunTimes = getSunTimes(
      selectedDate,
      clubCoordinates.latitude,
      clubCoordinates.longitude
    );

    // Convertir en minutes pour une comparaison plus précise
    const slotMinutes = hour * 60 + minute;
    const aeroStartMinutes =
      sunTimes.aeroStart.getHours() * 60 + sunTimes.aeroStart.getMinutes();
    const aeroEndMinutes =
      sunTimes.aeroEnd.getHours() * 60 + sunTimes.aeroEnd.getMinutes();

    return slotMinutes < aeroStartMinutes || slotMinutes > aeroEndMinutes;
  };

  const isFirstNightSlot = (hour: number, minute: number) => {
    if (!clubCoordinates) return false;

    const slotMinutes = hour * 60 + minute;
    const prevSlotMinutes = slotMinutes - 15;

    const sunTimes = getSunTimes(
      selectedDate,
      clubCoordinates.latitude,
      clubCoordinates.longitude
    );

    const aeroEndMinutes =
      sunTimes.aeroEnd.getHours() * 60 + sunTimes.aeroEnd.getMinutes();

    return slotMinutes > aeroEndMinutes && prevSlotMinutes <= aeroEndMinutes;
  };

  return (
    <div ref={timeGridRef} className="relative h-full">
      <div className="h-full overflow-auto">
        <div className="inline-flex min-w-full">
          {/* Colonne des heures - sticky left uniquement */}
          <div
            ref={hoursColumnRef}
            className="sticky left-0 w-20 bg-white border-r border-slate-200 z-20"
          >
            {/* En-tête vide pour aligner avec les avions */}
            <div className="h-[40px] bg-white border-b border-slate-200" />

            {/* Les heures */}
            <div>
              {timeSlots.map(({ hour, minute }, index) => (
                <div
                  key={`time-${hour}-${minute}`}
                  className="h-4 flex items-center justify-end pr-2 text-xs text-slate-500"
                >
                  {minute === 0 && (
                    <span className="font-semibold">{`${hour}h`}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contenu principal */}
          <div className="flex-1">
            {/* En-tête des avions */}
            <div
              className="sticky top-0 bg-white z-10 grid"
              style={{
                gridTemplateColumns: `repeat(${sortedAircraft.length}, minmax(${sortedAircraft.length > 1 ? '150px' : '200px'}, 1fr))`,
              }}
            >
              {sortedAircraft.map((aircraft) => (
                <div
                  key={`header-${aircraft.id}`}
                  className="p-2 text-center border-b border-r border-slate-200"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plane className="h-4 w-4" />
                    <span className="font-medium">{aircraft.registration}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Grille des créneaux */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${sortedAircraft.length}, minmax(${sortedAircraft.length > 1 ? '150px' : '200px'}, 1fr))`,
              }}
            >
              {sortedAircraft.map((aircraft) => (
                <div
                  key={`column-${aircraft.id}`}
                  className="relative border-r border-slate-200"
                >
                  {timeSlots.map(({ hour, minute }, index) => (
                    <div
                      key={`${hour}-${minute}`}
                      className={`h-4 border-b border-slate-100 relative group ${
                        minute === 45 ? "border-b-2 border-b-slate-200" : ""
                      } ${
                        isSlotSelected(hour, minute, aircraft.id)
                          ? "bg-sky-100"
                          : isNightTime(hour, minute)
                          ? "bg-gray-100"
                          : "bg-white hover:bg-slate-50"
                      }`}
                      data-time={`${hour}-${minute}`}
                      data-aircraft={aircraft.id}
                      onMouseDown={(e) => handleMouseDown(hour, minute, aircraft.id, e)}
                      onMouseMove={() => handleMouseMove(hour, minute)}
                      onMouseUp={(e) => handleMouseUp(e)}
                    >
                      {isFirstNightSlot(hour, minute) && (
                        <div className="absolute -top-1 left-0 w-full flex items-center justify-center">
                          <Moon className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isSlotSelected(hour, minute, aircraft.id)
                          ? (() => {
                              const times = getSelectionTimes();
                              return times
                                ? `${times.startTime} à ${times.endTime}`
                                : "";
                            })()
                          : `${hour.toString().padStart(2, "0")}:${minute
                              .toString()
                              .padStart(2, "0")}`}
                      </div>
                    </div>
                  ))}

                  {/* Reservations */}
                  {getReservationsForAircraft(aircraft.id).map((reservation) =>
                    renderReservation(reservation)
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showReservationModal && selectedReservation && (
        <ReservationModal
          startTime={selectedReservation.startTime}
          endTime={selectedReservation.endTime}
          onClose={() => setShowReservationModal(false)}
          onSuccess={() => {
            setShowReservationModal(false);
            onReservationUpdate(selectedReservation.reservation);
          }}
          aircraft={aircraft}
          users={users}
          preselectedAircraftId={selectedReservation.aircraftId}
          existingReservation={selectedReservation.reservation}
        />
      )}
    </div>
  );
};

export default TimeGrid;
