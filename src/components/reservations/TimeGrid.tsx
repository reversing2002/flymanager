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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ hour: number; minute: number; aircraftId: string } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ hour: number; minute: number } | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const timeGridRef = useRef<HTMLDivElement>(null);
  const startHour = 7;
  const endHour = 21;
  const timeSlots = [];

  // Filter only available aircraft
  const availableAircraft = aircraft.filter((a) => a.status === "AVAILABLE");

  // Trier les avions selon leur position dans aircraft_order
  const sortedAircraft = [...availableAircraft].sort((a, b) => {
    const positionA = aircraftOrder?.[a.id] ?? Infinity;
    const positionB = aircraftOrder?.[b.id] ?? Infinity;
    return positionA - positionB;
  });

  const cleanSelectedDate = new Date(selectedDate);
  cleanSelectedDate.setHours(0, 0, 0, 0);

  // Generate time slots
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      timeSlots.push({ hour, minute });
    }
  }

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs((prev) => [...prev, `${new Date().toISOString()} - ${message}`]);
  };

  const handleMouseDown = (hour: number, minute: number, aircraftId: string) => {
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
      // Créer les dates sans ajustement de fuseau horaire
      const start = new Date(selectedDate);
      const end = new Date(selectedDate);
      
      // Définir les heures en préservant le fuseau horaire
      start.setHours(selectionStart.hour);
      start.setMinutes(selectionStart.minute);
      start.setSeconds(0);
      start.setMilliseconds(0);
      
      // Si c'est un clic simple (même heure de début et de fin), ajouter 15 minutes
      if (selectionStart.hour === selectionEnd.hour && selectionStart.minute === selectionEnd.minute) {
        end.setHours(selectionStart.hour);
        end.setMinutes(selectionStart.minute + 15);
      } else {
        end.setHours(selectionEnd.hour);
        end.setMinutes(selectionEnd.minute);
      }
      end.setSeconds(0);
      end.setMilliseconds(0);
      
      // S'assurer que la fin est après le début
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

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting]);

  const isSlotSelected = (hour: number, minute: number, aircraftId: string) => {
    if (!isSelecting || !selectionStart || !selectionEnd || selectionStart.aircraftId !== aircraftId) {
      return false;
    }

    const slotTime = hour * 60 + minute;
    const startTime = selectionStart.hour * 60 + selectionStart.minute;
    const endTime = selectionEnd.hour * 60 + selectionEnd.minute;

    return slotTime >= Math.min(startTime, endTime) && slotTime <= Math.max(startTime, endTime);
  };

  const getReservationsForAircraft = (aircraftId: string) => {
    return reservations.filter((reservation) => {
      const reservationStart = new Date(reservation.startTime);
      const reservationEnd = new Date(reservation.endTime);

      // Check if the reservation overlaps with the selected day
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

  const canModifyReservation = (reservation: Reservation) => {
    return (
      user?.role === "ADMIN" ||
      user?.role === "INSTRUCTOR" ||
      reservation.userId === user?.id
    );
  };

  const canEditReservation = (reservation: Reservation) => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    return reservation.userId === user.id || 
           reservation.pilotId === user.id ||
           reservation.instructorId === user.id;
  };

  const handleCreateFlight = (reservation: Reservation) => {
    // Check if a flight already exists
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

    // Find the pilot
    const pilot = users.find((u) => u.id === reservation.pilotId);
    const instructor = reservation.instructorId
      ? users.find((u) => u.id === reservation.instructorId)
      : undefined;

    // Calculate duration in minutes
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
        duration,
        date: format(startTime, "yyyy-MM-dd"),
      },
    });
  };

  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize-start' | 'resize-end' | null;
    reservation: Reservation | null;
    startY: number;
    startX: number;
    originalStart: Date;
    originalEnd: Date;
    originalAircraftId: string;
    previewStart?: Date;
    previewEnd?: Date;
    previewAircraftId?: string;
  }>({
    type: null,
    reservation: null,
    startY: 0,
    startX: 0,
    originalStart: new Date(),
    originalEnd: new Date(),
    originalAircraftId: '',
  });

  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<{
    reservation: Reservation;
    startTime: Date;
    endTime: Date;
    aircraftId: string;
  } | null>(null);

  const formatDateToUTC = (date: Date): string => {
    const localDate = new Date(date);
    const year = localDate.getFullYear();
    const month = localDate.getMonth();
    const day = localDate.getDate();
    const hours = localDate.getHours();
    const minutes = localDate.getMinutes();
    
    // Créer une date UTC en préservant les heures locales
    return new Date(Date.UTC(year, month, day, hours, minutes)).toISOString();
  };

  const handleReservationMouseDown = (e: React.MouseEvent, reservation: Reservation, type: 'move' | 'resize-start' | 'resize-end') => {
    if (!canModifyReservation(reservation)) return;
    
    e.stopPropagation();
    const rect = timeGridRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragState({
      type,
      reservation,
      startY: e.clientY,
      startX: e.clientX,
      originalStart: new Date(reservation.startTime),
      originalEnd: new Date(reservation.endTime),
      originalAircraftId: reservation.aircraftId,
      previewStart: new Date(reservation.startTime),
      previewEnd: new Date(reservation.endTime),
      previewAircraftId: reservation.aircraftId,
    });
  };

  const handleReservationMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!dragState.type || !dragState.reservation) return;

    const gridRect = timeGridRef.current?.getBoundingClientRect();
    if (!gridRect) return;

    // Calculer le déplacement
    const deltaY = e.clientY - dragState.startY;
    const deltaX = e.clientX - dragState.startX;

    // Convertir le déplacement vertical en minutes (chaque cellule = 40px = 15min)
    const minutesDelta = Math.round(deltaY / 40) * 15;
    
    // Calculer le déplacement horizontal en nombre d'avions
    const aircraftWidth = gridRect.width / availableAircraft.length;
    const aircraftIndex = Math.max(0, Math.min(
      availableAircraft.length - 1,
      Math.floor((e.clientX - gridRect.left - 80) / aircraftWidth)
    ));

    // Créer de nouvelles dates en copiant les dates originales
    let newStart = new Date(dragState.originalStart);
    let newEnd = new Date(dragState.originalEnd);
    
    if (dragState.type === 'move') {
      // Pour le déplacement, on ajoute le delta aux deux dates
      newStart = new Date(newStart.getTime() + minutesDelta * 60000);
      newEnd = new Date(newEnd.getTime() + minutesDelta * 60000);
    } else if (dragState.type === 'resize-start') {
      // Pour le redimensionnement du début, on modifie uniquement la date de début
      newStart = new Date(newStart.getTime() + minutesDelta * 60000);
      if (newStart >= newEnd) {
        newStart = new Date(newEnd.getTime() - 15 * 60000);
      }
    } else if (dragState.type === 'resize-end') {
      // Pour le redimensionnement de la fin, on modifie uniquement la date de fin
      newEnd = new Date(newEnd.getTime() + minutesDelta * 60000);
      if (newEnd <= newStart) {
        newEnd = new Date(newStart.getTime() + 15 * 60000);
      }
    }

    // Mettre à jour l'aperçu
    setDragState(prev => ({
      ...prev,
      previewStart: newStart,
      previewEnd: newEnd,
      previewAircraftId: availableAircraft[aircraftIndex]?.id || prev.originalAircraftId,
    }));
  };

  const handleReservationMouseUp = () => {
    if (dragState.type && dragState.reservation && dragState.previewStart && dragState.previewEnd && dragState.previewAircraftId) {
      // Au lieu de mettre à jour directement, on stocke les nouvelles valeurs et on ouvre la modal
      setSelectedReservation({
        reservation: dragState.reservation,
        startTime: dragState.previewStart,
        endTime: dragState.previewEnd,
        aircraftId: dragState.previewAircraftId,
      });
      setShowReservationModal(true);

      // Réinitialiser l'état du drag
      setDragState({
        type: null,
        reservation: null,
        startY: 0,
        startX: 0,
        originalStart: new Date(),
        originalEnd: new Date(),
        originalAircraftId: '',
      });
    }
  };

  const handleModalClose = () => {
    setShowReservationModal(false);
    setSelectedReservation(null);
  };

  const handleModalSuccess = () => {
    setShowReservationModal(false);
    setSelectedReservation(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      handleReservationMouseUp();
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragState.type && dragState.reservation) {
        e.preventDefault();
        handleReservationMouseMove(e as unknown as React.MouseEvent);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [dragState.type, dragState.reservation]);

  const renderReservation = (reservation: Reservation) => {
    // Utiliser les valeurs d'aperçu si la réservation est en cours de déplacement
    const isBeingDragged = dragState.reservation?.id === reservation.id;
    const startTime = isBeingDragged && dragState.previewStart ? dragState.previewStart : new Date(reservation.startTime);
    const endTime = isBeingDragged && dragState.previewEnd ? dragState.previewEnd : new Date(reservation.endTime);
    const aircraftId = isBeingDragged && dragState.previewAircraftId ? dragState.previewAircraftId : reservation.aircraftId;

    const duration = differenceInMinutes(endTime, startTime);
    const height = (duration / 15) * 2.5;
    const top = ((startTime.getHours() - startHour) * 4 + startTime.getMinutes() / 15) * 2.5;

    // Find the pilot
    const pilotInfo = users.find((u) => u.id === reservation.pilotId) || {
      firstName: "?",
      lastName: "?",
    };

    const hasAssociatedFlight = flights.some(
      (flight) => flight.reservationId === reservation.id
    );

    // Define colors based on state
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

    const canModify = canModifyReservation(reservation);
    const isEditable = canEditReservation(reservation);
    const hasStarted = new Date() > new Date(reservation.startTime);
    const isCompleted = flights.some((f) => f.reservationId === reservation.id);

    return (
      <div
        className={`absolute inset-x-0 mx-0.5 sm:mx-1 ${bgColor} ${textColor} rounded-md text-xs overflow-hidden transition-colors shadow-sm border ${borderColor} group
          ${isEditable && !isCompleted ? 'hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer' : ''}`}
        style={{
          height: `${height}rem`,
          top: `${top}rem`,
          zIndex: dragState.reservation?.id === reservation.id ? 2 : 1,
        }}
        onMouseDown={(e) => {
          if (isEditable && !isCompleted) {
            handleReservationMouseDown(e, reservation, 'move');
          }
        }}
        onMouseUp={(e) => {
          if (isEditable && !isCompleted && !dragState.type) {
            onReservationClick(reservation);
          }
          handleMouseUp(e);
        }}
        onMouseMove={handleMouseMove}
      >
        {/* Poignées de redimensionnement */}
        {canModify && (
          <>
            <div
              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-gradient-to-b from-slate-300/50"
              onMouseDown={(e) => handleReservationMouseDown(e, reservation, 'resize-start')}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-gradient-to-t from-slate-300/50"
              onMouseDown={(e) => handleReservationMouseDown(e, reservation, 'resize-end')}
            />
          </>
        )}

        <div className="p-1 sm:p-2">
          <div className="font-medium">
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
          </div>
          <div className="mt-1 line-clamp-2">
            {pilotInfo.firstName} {pilotInfo.lastName}
          </div>
        </div>
      </div>
    );
  };

  const [draggedAircraft, setDraggedAircraft] = useState<string | null>(null);
  const [dragOverAircraft, setDragOverAircraft] = useState<string | null>(null);

  const handleAircraftDragStart = (aircraftId: string) => {
    if (user?.role !== 'ADMIN') return;
    setDraggedAircraft(aircraftId);
  };

  const handleAircraftDragOver = (e: React.DragEvent, aircraftId: string) => {
    if (user?.role !== 'ADMIN' || !draggedAircraft) return;
    e.preventDefault();
    setDragOverAircraft(aircraftId);
  };

  const handleAircraftDrop = (targetAircraftId: string) => {
    console.log("Drop event:", {
      userRole: user?.role,
      draggedAircraft,
      hasCallback: !!onAircraftOrderChange,
      targetAircraftId,
      sortedAircraft: sortedAircraft.map(a => ({ id: a.id, registration: a.registration }))
    });
    
    if (user?.role !== 'ADMIN' || !draggedAircraft || !onAircraftOrderChange) {
      console.log("Drop cancelled:", {
        notAdmin: user?.role !== 'ADMIN',
        noDraggedAircraft: !draggedAircraft,
        noCallback: !onAircraftOrderChange
      });
      return;
    }
    
    // Créer un tableau des avions dans leur ordre actuel
    const orderedAircraft = [...sortedAircraft].sort((a, b) => {
      const orderA = aircraftOrder?.[a.id] ?? Infinity;
      const orderB = aircraftOrder?.[b.id] ?? Infinity;
      return orderA - orderB;
    });
    
    // Retirer l'avion déplacé
    const aircraftList = orderedAircraft.map(a => a.id);
    const sourceIndex = aircraftList.indexOf(draggedAircraft);
    if (sourceIndex !== -1) {
      aircraftList.splice(sourceIndex, 1);
    }
    
    // Trouver l'index de la cible
    const targetIndex = aircraftList.indexOf(targetAircraftId);
    
    // Insérer l'avion déplacé avant la cible
    if (targetIndex !== -1) {
      aircraftList.splice(targetIndex, 0, draggedAircraft);
    } else {
      // Si la cible n'est pas trouvée, ajouter à la fin
      aircraftList.push(draggedAircraft);
    }
    
    // Générer le nouvel ordre
    const newOrder: { [key: string]: number } = {};
    aircraftList.forEach((id, index) => {
      newOrder[id] = index;
    });
    
    console.log("New order:", {
      newOrder,
      draggedAircraft,
      targetAircraftId,
      currentOrder: aircraftOrder,
      orderedAircraft: orderedAircraft.map(a => ({ id: a.id, registration: a.registration }))
    });
    
    onAircraftOrderChange(newOrder);
    setDraggedAircraft(null);
    setDragOverAircraft(null);
  };

  // Add this useEffect for initial scroll
  useEffect(() => {
    if (timeGridRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Calculate scroll position
      const scrollPosition =
        ((currentHour - startHour) * 4 + currentMinute / 15) * 40; // 40px is the height of a slot

      timeGridRef.current.scrollTop = Math.max(0, scrollPosition - 200); // 200px offset to see previous slots
    }
  }, []);

  return (
    <div ref={timeGridRef} className="relative overflow-hidden">
      {/* En-tête fixe pour la colonne des heures */}
      <div className="absolute left-0 top-0 w-20 h-[40px] bg-white z-20 border-r border-b border-slate-200" />

      {/* Grille des heures (fixe) */}
      <div className="absolute left-0 top-[40px] bottom-0 w-20 bg-white z-10 border-r border-slate-200">
        {timeSlots.map(({ hour, minute }, index) => (
          <div
            key={index}
            className="h-10 flex items-center justify-end pr-2 text-sm text-slate-500"
          >
            {`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`}
          </div>
        ))}
      </div>

      {/* Container avec scroll horizontal pour les avions */}
      <div className="overflow-x-auto">
        <div className="ml-20 min-w-full">
          {/* En-têtes des avions */}
          <div className="grid sticky top-0 bg-white z-10" style={{ gridTemplateColumns: `repeat(${sortedAircraft.length}, minmax(200px, 1fr))` }}>
            {sortedAircraft.map((aircraft) => (
              <div
                key={aircraft.id}
                className={`p-2 text-center border-b border-slate-200 ${user?.role === 'ADMIN' ? 'cursor-move' : ''} ${dragOverAircraft === aircraft.id ? 'bg-sky-50' : ''}`}
                draggable={user?.role === 'ADMIN'}
                onDragStart={() => handleAircraftDragStart(aircraft.id)}
                onDragOver={(e) => handleAircraftDragOver(e, aircraft.id)}
                onDrop={() => handleAircraftDrop(aircraft.id)}
              >
                <div className="flex items-center justify-center gap-2">
                  <Plane className="h-4 w-4" />
                  <span className="font-medium">{aircraft.registration}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Grille des créneaux */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${sortedAircraft.length}, minmax(200px, 1fr))` }}>
            {/* Lignes horizontales pour chaque créneau */}
            {sortedAircraft.map((aircraft) => (
              <div key={aircraft.id} className="relative">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`h-10 border-b border-slate-100 relative group ${
                      isSlotSelected(slot.hour, slot.minute, aircraft.id)
                        ? 'bg-sky-100'
                        : 'hover:bg-slate-50'
                    }`}
                    onMouseDown={() => handleMouseDown(slot.hour, slot.minute, aircraft.id)}
                    onMouseMove={() => handleMouseMove(slot.hour, slot.minute)}
                    onMouseUp={handleMouseUp}
                  >
                    {/* Affichage de l'heure au survol */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {`${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`}
                    </div>
                  </div>
                ))}

                {/* Réservations */}
                {getReservationsForAircraft(aircraft.id).map((reservation) => (
                  renderReservation(reservation)
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {showReservationModal && (
        <ReservationModal
          startTime={selectedReservation?.startTime}
          endTime={selectedReservation?.endTime}
          onClose={() => setShowReservationModal(false)}
          onSuccess={handleModalSuccess}
          aircraft={aircraft}
          users={users}
          preselectedAircraftId={selectedReservation?.aircraftId}
          existingReservation={selectedReservation?.reservation}
        />
      )}
    </div>
  );
};

export default TimeGrid;