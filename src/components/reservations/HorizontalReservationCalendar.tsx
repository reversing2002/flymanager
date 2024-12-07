import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfDay,
  isToday,
  isThisWeek,
  isBefore,
  isAfter,
  addHours,
  setHours,
  setMinutes,
  addMinutes,
  parse,
  subDays,
  addDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import type { Aircraft, Reservation, User } from "../../types/database";
import {
  getAircraft,
  getReservations,
  getUsers,
  updateReservation,
} from "../../lib/queries";
import { getAircraftOrder, updateAircraftOrder } from "../../services/aircraft";
import ReservationModal from "./ReservationModal";
import { toast } from "react-hot-toast";
import { validateReservation } from "../../lib/reservationValidation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { cn } from "../../lib/utils";
import SunTimesDisplay from "../common/SunTimesDisplay";

// Générer les intervalles de 15 minutes de 7h à 21h
const TIME_SLOTS = Array.from({ length: 57 }, (_, i) => {
  const hour = Math.floor(i / 4) + 7;
  const minutes = (i % 4) * 15;
  return { hour, minutes };
});

interface HorizontalReservationCalendarProps {
  filters: FilterState;
}

const HorizontalReservationCalendar = ({ filters }: HorizontalReservationCalendarProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [currentDate, setCurrentDate] = useState<Date>(startOfDay(new Date()));
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    start: Date;
    end: Date;
    aircraftId?: string;
  } | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftOrder, setAircraftOrder] = useState<{ [key: string]: number }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadInitialData();
  }, [selectedDate]);

  useEffect(() => {
    if (!reservations) return;

    let filtered = [...reservations];

    // Filtrer les réservations pour la journée sélectionnée
    filtered = filtered.filter(r => {
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);
      const dayStart = startOfDay(selectedDate);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      return (
        (start >= dayStart && start < dayEnd) || // Commence ce jour
        (end > dayStart && end <= dayEnd) || // Finit ce jour
        (start <= dayStart && end >= dayEnd) // Chevauche le jour
      );
    });

    // Filter reservations based on user role
    if (hasAnyGroup(currentUser, ['PILOT']) && !hasAnyGroup(currentUser, ['ADMIN', 'INSTRUCTOR', 'MECHANIC'])) {
      filtered = filtered.filter(r => r.userId === currentUser.id);
    }

    // Apply filters
    if (filters.aircraftTypes.length > 0) {
      filtered = filtered.filter(r => {
        const aircraftType = aircraft.find(a => a.id === r.aircraftId)?.type;
        return filters.aircraftTypes.includes(aircraftType || '');
      });
    }

    if (filters.instructors.length > 0) {
      filtered = filtered.filter(r => filters.instructors.includes(r.instructorId || ''));
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    if (filters.availability !== 'all') {
      switch (filters.availability) {
        case 'available':
          filtered = filtered.filter(r => {
            const start = new Date(r.startTime);
            const end = new Date(r.endTime);
            return !isBefore(start, new Date()) && !isAfter(end, new Date());
          });
          break;
        case 'today':
          filtered = filtered.filter(r => isToday(new Date(r.startTime)));
          break;
        case 'week':
          filtered = filtered.filter(r => isThisWeek(new Date(r.startTime), { locale: fr }));
          break;
      }
    }

    setFilteredReservations(filtered);
  }, [reservations, filters, aircraft, currentUser, selectedDate]);

  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  const loadInitialData = async () => {
    try {
      const aircraftData = await getAircraft();
      setAircraft(aircraftData);

      if (aircraftData[0]?.club_id) {
        const order = await getAircraftOrder(aircraftData[0].club_id);
        setAircraftOrder(order);
      }

      const startTime = setMinutes(setHours(selectedDate, 7), 0);
      const endTime = setMinutes(setHours(selectedDate, 22), 0);
      const reservationsData = await getReservations(startTime, endTime);
      setReservations(reservationsData);

      const usersData = await getUsers();
      console.log('Loaded users:', usersData);
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleTimeSlotClick = (
    startHour: number,
    startMinutes: number,
    aircraftId: string,
    endHour?: number,
    endMinutes?: number
  ) => {
    const start = setMinutes(setHours(selectedDate, startHour), startMinutes);
    let end;

    if (typeof endHour === 'number' && typeof endMinutes === 'number') {
      end = setMinutes(setHours(selectedDate, endHour), endMinutes);
      // Si la fin est avant le début, on ajoute 15 minutes au début
      if (end <= start) {
        end = addMinutes(start, 15);
      }
    } else {
      end = addMinutes(start, 15);
    }

    setSelectedTimeSlot({
      start,
      end,
      aircraftId,
    });
    setSelectedReservation(null);
    setShowReservationModal(true);
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setSelectedTimeSlot(null);
    setShowReservationModal(true);
  };

  const sortedAircraft = [...aircraft].sort((a, b) => {
    return (aircraftOrder[a.id] || 0) - (aircraftOrder[b.id] || 0);
  });

  const getReservationsForAircraft = (aircraftId: string) => {
    return filteredReservations.filter(r => r.aircraftId === aircraftId);
  };

  const SLOT_WIDTH = 1.5; // rem

  const calculateReservationStyle = (reservation: Reservation) => {
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    
    const startSlotIndex = TIME_SLOTS.findIndex(
      ({ hour, minutes }) => 
        hour === start.getHours() && 
        minutes <= start.getMinutes() && 
        minutes + 15 > start.getMinutes()
    );
    
    const endSlotIndex = TIME_SLOTS.findIndex(
      ({ hour, minutes }) => 
        hour === end.getHours() && 
        minutes <= end.getMinutes() && 
        minutes + 15 > end.getMinutes()
    );
    
    if (startSlotIndex === -1 || endSlotIndex === -1) {
      return null;
    }
    
    const width = (endSlotIndex - startSlotIndex + 1) * SLOT_WIDTH;
    const left = startSlotIndex * SLOT_WIDTH;
    
    return {
      left: `${left}rem`,
      width: `${width}rem`,
    };
  };

  const getReservationStatus = (reservation: Reservation) => {
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const now = new Date();

    if (isBefore(end, now)) return "past";
    if (isAfter(start, now)) return "future";
    return "current";
  };

  // Fonction pour déterminer si on doit afficher l'heure pour ce créneau
  const shouldShowTime = (hour: number, minutes: number) => {
    // Afficher uniquement les heures pleines
    return minutes === 0;
  };

  // Fonction pour formater l'heure
  const formatHour = (hour: number) => {
    return `${hour}h`;
  };

  // Fonction pour déterminer si on doit afficher la bordure pour ce créneau
  const shouldShowBorder = (hour: number, minutes: number) => {
    // Afficher une bordure plus marquée au début de chaque heure pleine
    return minutes === 45;  // La bordure sera sur le slot précédent celui de l'heure pleine
  };

  const handleCreateFlight = (reservation: Reservation) => {
    const selectedAircraft = aircraft.find(
      (a) => a.id === reservation.aircraftId
    );
    const pilot = users.find((u) => u.id === reservation.pilotId);
    const instructor = reservation.instructorId
      ? users.find((u) => u.id === reservation.instructorId)
      : undefined;

    // Calculer la durée en minutes
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    navigate("/flights/create", {
      state: {
        aircraftId: selectedAircraft?.id,
        pilotId: pilot?.id,
        instructorId: instructor?.id,
        duration,
        date: format(start, "yyyy-MM-dd"),
        time: format(start, "HH:mm"),
      },
    });
  };

  const handleReservationUpdate = async (reservation: Reservation) => {
    try {
      await updateReservation(reservation);
      await loadInitialData();
      toast.success("Réservation mise à jour avec succès");
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast.error("Erreur lors de la mise à jour de la réservation");
    }
  };

  const handleMouseDown = (hour: number, minutes: number, aircraftId: string) => {
    if (!isSelecting) {
      setIsSelecting(true);
      setSelectionStart({ hour, minute: minutes, aircraftId });
      setSelectionEnd({ hour, minute: minutes });
    }
  };

  const handleMouseMove = (hour: number, minutes: number) => {
    if (isSelecting && selectionStart) {
      setSelectionEnd({ hour, minute: minutes });
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd) {
      const start = new Date(selectedDate);
      start.setHours(selectionStart.hour, selectionStart.minute, 0, 0);

      const end = new Date(selectedDate);
      end.setHours(selectionEnd.hour, selectionEnd.minute, 0, 0);

      if (end > start) {
        handleTimeSlotClick(
          selectionStart.hour,
          selectionStart.minute,
          selectionStart.aircraftId,
          selectionEnd.hour,
          selectionEnd.minute
        );
      } else {
        handleTimeSlotClick(
          selectionEnd.hour,
          selectionEnd.minute,
          selectionStart.aircraftId,
          selectionStart.hour,
          selectionStart.minute
        );
      }

      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  const isSlotSelected = (hour: number, minute: number, aircraftId: string) => {
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

  // Fonction utilitaire pour trouver l'index du créneau horaire
  const findTimeSlotIndex = (hour: number, minutes: number) => {
    return ((hour - 7) * 4) + Math.floor(minutes / 15);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header avec la date */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <button onClick={handlePreviousDay} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 w-[16rem] justify-center">
              <CalendarIcon className="h-4 w-4" />
              <span className="font-medium">
                {format(selectedDate, "EEEE d MMMM", { locale: fr })}
              </span>
            </div>
            <button onClick={handleNextDay} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <SunTimesDisplay 
            date={selectedDate} 
            className="text-sm text-gray-600 bg-white/50 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(startOfDay(new Date()))}
            className={`px-3 py-1 text-sm rounded-md ${
              isToday(selectedDate)
                ? "bg-sky-100 text-sky-700"
                : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            Aujourd'hui
          </button>
        </div>
      </div>

      {/* Grille des réservations */}
      <div className="flex-1 overflow-auto">
        <div className="relative min-w-full">
          {/* En-tête des heures */}
          <div className="sticky top-0 z-10 flex border-b bg-white">
            <div className="w-20 min-w-[5rem] shrink-0 border-r bg-white" />
            {TIME_SLOTS.map(({ hour, minutes }) => (
              <div
                key={`${hour}-${minutes}`}
                className={cn(
                  "border-r py-1 text-center text-xs",
                  {
                    "font-medium": shouldShowTime(hour, minutes),
                    "border-r-2": shouldShowBorder(hour, minutes),
                    "border-r-gray-200": !shouldShowBorder(hour, minutes),
                  }
                )}
                style={{ width: `${SLOT_WIDTH}rem`, minWidth: `${SLOT_WIDTH}rem` }}
              >
                {shouldShowTime(hour, minutes) ? formatHour(hour) : ""}
              </div>
            ))}
          </div>

          {/* Corps de la grille */}
          <div className="relative">
            {sortedAircraft.map(aircraft => (
              <div key={aircraft.id} className="flex border-b hover:bg-gray-50">
                {/* Colonne des avions */}
                <div className="w-20 min-w-[5rem] shrink-0 border-r p-1 bg-white sticky left-0">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{aircraft.registration}</span>
                    <span className="text-xs text-gray-500">{aircraft.type}</span>
                  </div>
                </div>

                {/* Colonnes des créneaux horaires */}
                <div className="relative flex-1">
                  {/* Grille de fond */}
                  <div className="absolute inset-0 grid" style={{
                    gridTemplateColumns: `repeat(${TIME_SLOTS.length}, ${SLOT_WIDTH}rem)`,
                  }}>
                    {TIME_SLOTS.map(({ hour, minutes }) => (
                      <div
                        key={`grid-${hour}-${minutes}`}
                        className={cn(
                          "h-12 border-r",
                          {
                            "border-r-2 border-r-gray-200": shouldShowBorder(hour, minutes),
                            "border-r-gray-100": !shouldShowBorder(hour, minutes),
                          }
                        )}
                      />
                    ))}
                  </div>

                  {/* Zones cliquables */}
                  {TIME_SLOTS.map(({ hour, minutes }) => (
                    <div
                      key={`${hour}-${minutes}`}
                      style={{ 
                        left: `${findTimeSlotIndex(hour, minutes) * SLOT_WIDTH}rem`,
                        width: `${SLOT_WIDTH}rem`,
                      }}
                      className={cn(
                        "absolute h-12 cursor-pointer hover:bg-gray-50",
                        {
                          "bg-blue-100": isSlotSelected(hour, minutes, aircraft.id),
                        }
                      )}
                      onMouseDown={() => handleMouseDown(hour, minutes, aircraft.id)}
                      onMouseMove={() => handleMouseMove(hour, minutes)}
                      onMouseUp={handleMouseUp}
                    />
                  ))}
                  
                  {/* Réservations */}
                  {getReservationsForAircraft(aircraft.id).map(reservation => {
                    const status = getReservationStatus(reservation);
                    const style = calculateReservationStyle(reservation);
                    console.log('Looking for pilot with ID:', reservation.pilotId);
                    console.log('Available users:', users);
                    const pilot = users.find(u => u.id === reservation.pilotId);
                    console.log('Found pilot:', pilot);
                    const instructor = reservation.instructorId 
                      ? users.find(u => u.id === reservation.instructorId)
                      : undefined;
                    
                    if (!style) return null;
                    
                    return (
                      <div
                        key={reservation.id}
                        className={cn(
                          "absolute inset-y-1 rounded p-1 text-xs cursor-pointer z-10 shadow-sm hover:shadow-md transition-shadow",
                          {
                            "bg-blue-100": status === "future",
                            "bg-gray-100": status === "past",
                            "bg-green-100": status === "current",
                          }
                        )}
                        style={style}
                        onClick={() => handleReservationClick(reservation)}
                      >
                        <div className="font-medium truncate">
                          {pilot ? `${pilot.first_name} ${pilot.last_name}` : 'Pilote inconnu'}
                          {instructor && (
                            <span className="text-gray-500">
                              {" + "}
                              {`${instructor.first_name} ${instructor.last_name}`}
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 truncate">
                          {format(new Date(reservation.startTime), "HH:mm")} -{" "}
                          {format(new Date(reservation.endTime), "HH:mm")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de réservation */}
      {showReservationModal && (
        <ReservationModal
          startTime={selectedTimeSlot?.start || new Date()}
          endTime={selectedTimeSlot?.end || new Date()}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedTimeSlot(null);
            setSelectedReservation(null);
          }}
          onSuccess={loadInitialData}
          aircraft={aircraft}
          users={users}
          preselectedAircraftId={selectedTimeSlot?.aircraftId}
          existingReservation={selectedReservation}
          onCreateFlight={handleCreateFlight}
          onUpdate={handleReservationUpdate}
        />
      )}
    </div>
  );
};

export default HorizontalReservationCalendar;
