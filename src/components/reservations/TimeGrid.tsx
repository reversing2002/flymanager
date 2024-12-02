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
  const timeSlots = [];

  // Generate time slots
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      timeSlots.push({ hour, minute });
    }
  }

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
    if (!isSelecting) {
      setIsSelecting(true);
      setSelectionStart({ hour, minute, aircraftId });
      setSelectionEnd({ hour, minute });
    }
  };

  const handleMouseMove = (hour: number, minute: number) => {
    if (isSelecting && selectionStart) {
      setSelectionEnd({ hour, minute });
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd) {
      const start = new Date(selectedDate);
      start.setHours(selectionStart.hour, selectionStart.minute, 0, 0);

      const end = new Date(selectedDate);
      end.setHours(selectionEnd.hour, selectionEnd.minute, 0, 0);

      if (end > start) {
        onTimeSlotClick(start, end, selectionStart.aircraftId);
      } else {
        onTimeSlotClick(end, start, selectionStart.aircraftId);
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
    if (
      !isSelecting ||
      !selectionStart ||
      !selectionEnd ||
      selectionStart.aircraftId !== aircraftId
    ) {
      return false;
    }

    const slotTime = hour * 60 + minute;
    const startTime = selectionStart.hour * 60 + selectionStart.minute;
    const endTime = selectionEnd.hour * 60 + selectionEnd.minute;

    return (
      slotTime >= Math.min(startTime, endTime) &&
      slotTime <= Math.max(startTime, endTime)
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
    const height = (duration / 15) * 2.5;
    const top =
      ((startTime.getHours() - startHour) * 4 +
        startTime.getMinutes() / 15) *
      2.5;

    const pilot = users.find((u) => u.id === reservation.userId);
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
            {pilot ? `${pilot.first_name} ${pilot.last_name}` : "Pilote inconnu"}
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
          {timeSlots.map(({ hour, minute }, index) => (
            <div
              key={`time-${hour}-${minute}`}
              className="h-10 flex items-center justify-end pr-2 text-sm text-slate-500"
            >
              {`${hour.toString().padStart(2, "0")}:${minute
                .toString()
                .padStart(2, "0")}`}
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
                {timeSlots.map(({ hour, minute }, index) => (
                  <div
                    key={`slot-${aircraft.id}-${hour}-${minute}`}
                    className={`h-10 border-b border-slate-100 relative group ${
                      isSlotSelected(hour, minute, aircraft.id)
                        ? "bg-sky-100"
                        : "hover:bg-slate-50"
                    }`}
                    onMouseDown={() => handleMouseDown(hour, minute, aircraft.id)}
                    onMouseMove={() => handleMouseMove(hour, minute)}
                    onMouseUp={handleMouseUp}
                  >
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {`${hour.toString().padStart(2, "0")}:${minute
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