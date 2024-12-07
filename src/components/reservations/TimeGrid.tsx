import React, { useState, useRef, useEffect } from "react";
import {
  setMinutes,
  setHours,
  addMinutes,
  differenceInMinutes,
  format,
} from "date-fns";
import { Aircraft, Reservation, User } from "../../types/database";
import { useAuth } from "../../contexts/AuthContext";
import { Plane } from "lucide-react";
import { toast } from "react-hot-toast";
import ReservationModal from "./ReservationModal";

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
}) => {
  const { user } = useAuth();
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

  // Générer les créneaux horaires de manière optimisée
  const TIME_SLOTS = Array.from({ length: (endHour - startHour) * 4 }, (_, i) => {
    const hour = Math.floor(i / 4) + startHour;
    const minute = (i % 4) * 15;
    return { hour, minute };
  });

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

  const handleMouseDown = (
    hour: number,
    minute: number,
    aircraftId: string
  ) => {
    setIsSelecting(true);
    setSelectionStart({ hour, minute, aircraftId });
  };

  const handleMouseMove = (hour: number, minute: number) => {
    if (isSelecting) {
      setSelectionEnd({ hour, minute });
    }
  };

  const handleMouseUp = () => {
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

      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  const isSlotSelected = (
    hour: number,
    minute: number,
    aircraftId: string
  ) => {
    if (!selectionStart || !selectionEnd) return false;

    const startMinutes = selectionStart.hour * 60 + selectionStart.minute;
    const endMinutes = selectionEnd.hour * 60 + selectionEnd.minute;
    const slotMinutes = hour * 60 + minute;

    return (
      aircraftId === selectionStart.aircraftId &&
      (slotMinutes >= startMinutes && slotMinutes <= endMinutes)
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
      ((startTime.getHours() - startHour) * 4 +
        startTime.getMinutes() / 15) *
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
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
          </div>
          <div className="mt-1 line-clamp-2">
            {pilot ? pilot.first_name : "Pilote inconnu"}
            {reservation.instructorId && (
              <>
                {" + "}
                {users.find((u) => u.id === reservation.instructorId)?.first_name || "Instructeur inconnu"}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Synchroniser le défilement
  useEffect(() => {
    const gridContainer = gridContainerRef.current;
    const hoursColumn = hoursColumnRef.current;

    if (!gridContainer || !hoursColumn) return;

    const handleScroll = () => {
      hoursColumn.scrollTop = gridContainer.scrollTop;
    };

    gridContainer.addEventListener('scroll', handleScroll);
    return () => {
      gridContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div ref={timeGridRef} className="relative h-full">
      {/* Coin supérieur gauche fixe */}
      <div className="absolute left-0 top-0 w-20 h-[40px] bg-white z-20 border-r border-b border-slate-200" />

      {/* Colonne des heures */}
      <div 
        ref={hoursColumnRef}
        className="absolute left-0 top-[40px] bottom-0 w-20 bg-white z-10 border-r border-slate-200 overflow-hidden"
      >
        <div className="h-full">
          {TIME_SLOTS.map(({ hour, minute }, index) => (
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

      {/* Container principal avec scroll */}
      <div 
        ref={gridContainerRef}
        className="h-full overflow-auto ml-20"
      >
        <div className="min-w-full">
          {/* En-tête des avions (fixe en vertical) */}
          <div
            className="sticky top-0 bg-white z-10 grid"
            style={{
              gridTemplateColumns: `repeat(${sortedAircraft.length}, minmax(200px, 1fr))`,
            }}
          >
            {sortedAircraft.map((aircraft) => (
              <div
                key={`header-${aircraft.id}`}
                className="p-2 text-center border-b border-slate-200"
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
              gridTemplateColumns: `repeat(${sortedAircraft.length}, minmax(200px, 1fr))`,
            }}
          >
            {sortedAircraft.map((aircraft) => (
              <div key={`grid-${aircraft.id}`} className="relative">
                {TIME_SLOTS.map(({ hour, minute }, index) => (
                  <div
                    key={`slot-${aircraft.id}-${hour}-${minute}`}
                    className={`h-4 border-b border-slate-100 relative group ${
                      minute === 45 ? "border-b-2 border-b-slate-200" : ""
                    } ${
                      isSlotSelected(hour, minute, aircraft.id)
                        ? "bg-sky-100"
                        : "hover:bg-slate-50"
                    }`}
                    onMouseDown={(e) => handleMouseDown(hour, minute, aircraft.id)}
                    onMouseMove={(e) => handleMouseMove(hour, minute)}
                    onMouseUp={(e) => handleMouseUp()}
                  >
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isSlotSelected(hour, minute, aircraft.id) ? (
                        `${selectionStart?.hour}h à ${selectionEnd ? Math.ceil((selectionEnd.hour * 60 + selectionEnd.minute) / 60) : selectionStart?.hour + 1}h`
                      ) : (
                        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
                      )}
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