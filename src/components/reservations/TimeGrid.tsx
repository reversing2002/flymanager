import React, { useState, useRef, useEffect, useMemo } from "react";
import { setMinutes, setHours, differenceInMinutes, format, isToday } from "date-fns";
import { Aircraft, Reservation, User, Availability } from "../../types/database";
import { useAuth } from "../../contexts/AuthContext";
import { Plane, Moon } from "lucide-react";
import ReservationModal from "./ReservationModal";
import { getSunTimes } from "../../lib/sunTimes";
import { supabase } from "../../lib/supabase";
import toast from 'react-hot-toast';
import { fr } from 'date-fns/locale';

interface TimeGridProps {
  selectedDate: Date;
  onTimeSlotClick: (start: Date, end: Date, aircraft?: Aircraft, instructorId?: string) => void;
  onReservationClick: (reservation: Reservation) => void;
  onReservationUpdate: (reservation: Reservation) => void;
  reservations: Reservation[];
  availabilities: Availability[];
  aircraft: Aircraft[];
  aircraftOrder?: { [key: string]: number };
  onAircraftOrderChange?: (newOrder: { [key: string]: number }) => void;
  users: User[];
  flights: { reservationId: string }[];
  onDateChange?: (date: Date) => void;
  nightFlightsEnabled: boolean;
  filters?: {
    aircraftTypes?: string[];
    instructors?: string[];
  };
}

const TimeGrid: React.FC<TimeGridProps> = ({
  selectedDate,
  onTimeSlotClick,
  onReservationClick,
  onReservationUpdate,
  reservations,
  availabilities,
  aircraft,
  aircraftOrder,
  onAircraftOrderChange,
  users,
  flights,
  onDateChange,
  nightFlightsEnabled,
  filters,
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

  const generateTimeSlots = () => {
    if (!clubCoordinates) {
      const defaultStartHour = 7;
      const defaultEndHour = nightFlightsEnabled ? 21 : 18;
      return generateSlotsForHours(defaultStartHour, defaultEndHour);
    }

    const sunTimes = getSunTimes(
      selectedDate,
      clubCoordinates.latitude,
      clubCoordinates.longitude
    );

    const startMinutes =
      sunTimes.aeroStart.getHours() * 60 + sunTimes.aeroStart.getMinutes();
    const endMinutes =
      sunTimes.aeroEnd.getHours() * 60 + sunTimes.aeroEnd.getMinutes();

    const roundedStartMinutes = Math.floor(startMinutes / 15) * 15;
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

  const [timeSlots, setTimeSlots] = useState(generateTimeSlots());

  useEffect(() => {
    setTimeSlots(generateTimeSlots());
  }, [selectedDate, clubCoordinates, nightFlightsEnabled]);

  // Filtrer les appareils disponibles et les instructeurs en fonction des filtres
  const filteredAircraft = useMemo(() => {
    let filtered = aircraft.filter(a => a.status === "AVAILABLE");
    
    if (filters?.aircraftTypes?.length > 0) {
      filtered = filtered.filter(a => filters.aircraftTypes.includes(a.id));
    }

    return filtered;
  }, [aircraft, filters?.aircraftTypes]);

  const filteredInstructors = useMemo(() => {
    if (!filters?.instructors?.length) return [];
    return users.filter(user => filters.instructors?.includes(user.id));
  }, [users, filters?.instructors]);

  const sortedAircraft = useMemo(() => {
    return [...filteredAircraft].sort((a, b) => {
      const positionA = aircraftOrder?.[a.id] ?? Infinity;
      const positionB = aircraftOrder?.[b.id] ?? Infinity;
      return positionA - positionB;
    });
  }, [filteredAircraft, aircraftOrder]);

  const cleanSelectedDate = new Date(selectedDate);
  cleanSelectedDate.setHours(0, 0, 0, 0);

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
    if (event.type === "mousedown") {
      const handler = setTimeout(() => {
        setIsSelecting(true);
        setSelectionStart({ hour, minute, aircraftId });
      }, 200); // Délai court pour différencier clic et glisser

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
      const endMinutes = selectionEnd.hour * 60 + selectionEnd.minute;
      const roundedEndMinutes = Math.ceil(endMinutes / 15) * 15 + 15;
      const endHour = Math.floor(roundedEndMinutes / 60);
      const endMinute = roundedEndMinutes % 60;
      end.setHours(endHour, endMinute, 0, 0);

      if (end > start) {
        onTimeSlotClick(start, end, selectionStart.aircraftId);
      } else {
        const adjustedStart = new Date(selectedDate);
        const startMinutes = selectionEnd.hour * 60 + selectionEnd.minute;
        const roundedStartMinutes = Math.floor(startMinutes / 15) * 15;
        const startHour = Math.floor(roundedStartMinutes / 60);
        const startMinute = roundedStartMinutes % 60;
        adjustedStart.setHours(startHour, startMinute, 0, 0);

        const adjustedEnd = new Date(start);
        adjustedEnd.setMinutes(adjustedEnd.getMinutes() + 15);

        onTimeSlotClick(adjustedStart, adjustedEnd, selectionStart.aircraftId);
      }
    }

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
            {format(startTime, "H'h'mm")} - {format(endTime, "H'h'mm")}
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

  const isCurrentTimeSlot = (hour: number, minute: number) => {
    if (!isToday(selectedDate)) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.floor(now.getMinutes() / 15) * 15;
    
    return currentHour === hour && currentMinute === minute;
  };

  const isPastTimeSlot = (hour: number, minute: number) => {
    if (!isToday(selectedDate)) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = Math.floor(now.getMinutes() / 15) * 15;
    
    return (hour < currentHour) || (hour === currentHour && minute < currentMinute);
  };

  const renderTimeSlot = (aircraft: Aircraft, hour: number, minute: number) => {
    const slotStart = setMinutes(setHours(selectedDate, hour), minute);
    const slotEnd = setMinutes(setHours(selectedDate, hour), minute + 30);

    // Trouver l'indisponibilité qui bloque ce créneau
    const blockingAvailability = availabilities.find((availability) => {
      if (availability.aircraft_id && availability.aircraft_id !== aircraft.id) {
        return false;
      }
      
      const availStart = new Date(availability.start_time);
      const availEnd = new Date(availability.end_time);
      
      return (
        (slotStart >= availStart && slotStart < availEnd) ||
        (slotEnd > availStart && slotEnd <= availEnd) ||
        (slotStart <= availStart && slotEnd >= availEnd)
      );
    });

    const isUnavailable = !!blockingAvailability;

    const reservation = reservations.find(
      (r) =>
        r.aircraftId === aircraft.id &&
        slotStart >= new Date(r.startTime) &&
        slotEnd <= new Date(r.endTime)
    );

    const flight = reservation
      ? flights.find((f) => f.reservationId === reservation.id)
      : null;

    const slotClasses = [
      "h-4",
      "border-r",
      "border-gray-200",
      "transition-colors",
      "duration-150",
      "cursor-pointer",
      minute === 0 ? "border-t" : "",
    ];

    if (isUnavailable) {
      slotClasses.push("bg-red-100 cursor-not-allowed");
    } else if (reservation) {
      slotClasses.push(
        flight ? "bg-blue-500" : "bg-blue-200",
        "hover:bg-blue-300"
      );
    } else {
      slotClasses.push("hover:bg-gray-100");
    }

    const handleClick = () => {
      if (isUnavailable && blockingAvailability) {
        const start = new Date(blockingAvailability.start_time);
        const end = new Date(blockingAvailability.end_time);
        const reason = blockingAvailability.reason || "Aucune raison spécifiée";
        
        toast.error(
          `Créneau indisponible : ${reason}\nDu ${format(start, "dd/MM/yyyy HH:mm", { locale: fr })} au ${format(end, "dd/MM/yyyy HH:mm", { locale: fr })}`,
          { duration: 4000 }
        );
        return;
      }
      if (reservation) {
        onReservationClick(reservation);
      } else {
        onTimeSlotClick(slotStart, slotEnd, aircraft);
      }
    };

    const getSlotTitle = () => {
      if (isUnavailable && blockingAvailability) {
        const start = new Date(blockingAvailability.start_time);
        const end = new Date(blockingAvailability.end_time);
        const reason = blockingAvailability.reason || "Aucune raison spécifiée";
        return `Indisponible : ${reason}\nDu ${format(start, "dd/MM/yyyy HH:mm", { locale: fr })} au ${format(end, "dd/MM/yyyy HH:mm", { locale: fr })}`;
      }
      if (reservation) {
        return `Réservé par ${
          users.find((u) => u.id === reservation.userId)?.name ||
          "Utilisateur inconnu"
        }`;
      }
      return "Disponible";
    };

    return (
      <div
        key={`${aircraft.id}-${hour}-${minute}`}
        className={slotClasses.join(" ")}
        onClick={handleClick}
        title={getSlotTitle()}
      />
    );
  };

  return (
    <div ref={timeGridRef} className="relative h-full">
      <div className="h-full overflow-auto">
        <div className="inline-flex min-w-full">
          <div
            ref={hoursColumnRef}
            className="sticky left-0 w-10 bg-white border-r border-slate-200 z-20"
          >
            <div className="h-[40px] bg-white border-b border-slate-200" />

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

          <div className="flex-1 relative">
            <div
              className="sticky top-0 bg-white z-10 grid"
              style={{
                gridTemplateColumns: `repeat(${sortedAircraft.length + filteredInstructors.length}, minmax(${(sortedAircraft.length + filteredInstructors.length) > 1 ? '150px' : '200px'}, 1fr))`,
              }}
            >
              {sortedAircraft.map((aircraft) => (
                <div
                  key={`header-${aircraft.id}`}
                  className="p-2 text-center border-b border-r border-slate-200"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center justify-center gap-2">
                      <Plane className="h-4 w-4" />
                      <span className="font-medium">{aircraft.registration}</span>
                    </div>
                    <span className="text-xs text-slate-500">{aircraft.name}</span>
                  </div>
                </div>
              ))}
              {filteredInstructors.map((instructor) => (
                <div
                  key={`header-instructor-${instructor.id}`}
                  className="p-2 text-center border-b border-r border-slate-200"
                >
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">{instructor.first_name} {instructor.last_name}</span>
                    </div>
                    <span className="text-xs text-slate-500">Instructeur</span>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${sortedAircraft.length + filteredInstructors.length}, minmax(${(sortedAircraft.length + filteredInstructors.length) > 1 ? '150px' : '200px'}, 1fr))`,
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
                          : isCurrentTimeSlot(hour, minute)
                          ? "bg-gray-200"
                          : isPastTimeSlot(hour, minute)
                          ? "bg-gray-100"
                          : isNightTime(hour, minute)
                          ? "bg-gray-100"
                          : "bg-white hover:bg-slate-50"
                      } ${
                        isPastTimeSlot(hour, minute) ? "cursor-not-allowed" : ""
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
                      {renderTimeSlot(aircraft, hour, minute)}
                    </div>
                  ))}

                  {getReservationsForAircraft(aircraft.id).map((reservation) =>
                    renderReservation(reservation)
                  )}
                </div>
              ))}
              {filteredInstructors.map((instructor) => (
                <div
                  key={`column-instructor-${instructor.id}`}
                  className="relative border-r border-slate-200"
                >
                  {timeSlots.map(({ hour, minute }) => (
                    <div
                      key={`${hour}-${minute}`}
                      className={`h-4 border-b border-slate-100 relative group ${
                        minute === 45 ? "border-b-2 border-b-slate-200" : ""
                      } ${
                        isCurrentTimeSlot(hour, minute)
                          ? "bg-gray-200"
                          : isPastTimeSlot(hour, minute)
                          ? "bg-gray-100"
                          : isNightTime(hour, minute)
                          ? "bg-gray-100"
                          : "bg-white hover:bg-slate-50"
                      } ${
                        isPastTimeSlot(hour, minute) ? "cursor-not-allowed" : ""
                      }`}
                      data-time={`${hour}-${minute}`}
                      data-instructor={instructor.id}
                    >
                      {isFirstNightSlot(hour, minute) && (
                        <div className="absolute -top-1 left-0 w-full flex items-center justify-center">
                          <Moon className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                  {reservations
                    .filter(res => res.instructorId === instructor.id)
                    .map((reservation) => renderReservation(reservation))}
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
