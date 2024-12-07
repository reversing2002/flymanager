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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Moon } from "lucide-react";
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
import { getSunTimes } from "../../lib/sunTimes";

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

  const [clubCoordinates, setClubCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const loadClubCoordinates = async () => {
      if (!currentUser?.club?.id) return;

      const { data: clubData } = await supabase
        .from('clubs')
        .select('latitude, longitude')
        .eq('id', currentUser.club.id)
        .single();

      if (clubData?.latitude && clubData?.longitude) {
        setClubCoordinates(clubData);
      }
    };

    loadClubCoordinates();
  }, [currentUser?.club?.id]);

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

  const isNightTime = (hour: number, minute: number) => {
    if (!clubCoordinates) return false;
    
    const slotTime = setMinutes(setHours(new Date(selectedDate), hour), minute);
    const sunTimes = getSunTimes(selectedDate, clubCoordinates.latitude, clubCoordinates.longitude);
    return slotTime < sunTimes.aeroStart || slotTime > sunTimes.aeroEnd;
  };

  const isFirstNightSlot = (hour: number, minute: number) => {
    if (!clubCoordinates) return false;
    
    const slotTime = setMinutes(setHours(new Date(selectedDate), hour), minute);
    const prevSlotTime = new Date(slotTime);
    prevSlotTime.setMinutes(prevSlotTime.getMinutes() - 15);
    
    const sunTimes = getSunTimes(selectedDate, clubCoordinates.latitude, clubCoordinates.longitude);
    return slotTime > sunTimes.aeroEnd && prevSlotTime <= sunTimes.aeroEnd;
  };

  const isFirstSelectedSlot = (hour: number, minutes: number, aircraftId: string) => {
    if (!selectedTimeSlot || selectedTimeSlot.aircraftId !== aircraftId) return false;

    const slotTime = new Date(selectedDate);
    slotTime.setHours(hour, minutes, 0, 0);

    return slotTime.getTime() === selectedTimeSlot.start.getTime();
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
    const start = setMinutes(setHours(selectedDate, hour), minutes);
    setIsSelecting(true);
    setSelectionStart({
      hour,
      minute: minutes,
      aircraftId,
    });
    setSelectionEnd({ hour, minute: minutes });
    setSelectedTimeSlot({
      start,
      end: addMinutes(start, 15),
      aircraftId,
    });
  };

  const handleMouseMove = (hour: number, minutes: number) => {
    if (!isSelecting || !selectionStart) return;

    setSelectionEnd({ hour, minute: minutes });

    // Calculer le début et la fin de la sélection
    const startTime = new Date(selectedDate);
    startTime.setHours(
      Math.min(selectionStart.hour, hour),
      Math.min(selectionStart.minute, minutes),
      0,
      0
    );

    const endTime = new Date(selectedDate);
    endTime.setHours(
      Math.max(selectionStart.hour, hour),
      Math.max(selectionStart.minute, minutes),
      0,
      0
    );

    // Ajouter 15 minutes à la fin pour inclure le dernier créneau
    endTime.setMinutes(endTime.getMinutes() + 15);

    setSelectedTimeSlot({
      start: startTime,
      end: endTime,
      aircraftId: selectionStart.aircraftId,
    });
  };

  const handleMouseUp = () => {
    if (isSelecting && selectedTimeSlot) {
      setShowReservationModal(true);
    }
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const isSlotSelected = (hour: number, minutes: number, aircraftId: string) => {
    if (!selectedTimeSlot || selectedTimeSlot.aircraftId !== aircraftId) return false;

    const slotTime = new Date(selectedDate);
    slotTime.setHours(hour, minutes, 0, 0);

    return (
      slotTime >= selectedTimeSlot.start &&
      slotTime < selectedTimeSlot.end
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
            <div className="flex">
              {TIME_SLOTS.map(({ hour, minutes }) => (
                <div
                  key={`${hour}-${minutes}`}
                  className={cn(
                    "w-6 h-8 border-r flex items-center justify-center",
                    {
                      "border-r-2 border-r-gray-200": shouldShowBorder(hour, minutes),
                      "border-r-gray-100": !shouldShowBorder(hour, minutes),
                      "bg-gray-50": isNightTime(hour, minutes),
                    }
                  )}
                >
                  {shouldShowTime(hour, minutes) && (
                    <span className="text-xs text-gray-500">{formatHour(hour)}</span>
                  )}
                  {isFirstNightSlot(hour, minutes) && (
                    <div className="absolute -top-2 left-0 w-full flex items-center justify-center">
                      <Moon className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Corps de la grille */}
          <div className="relative">
            {sortedAircraft.map((aircraft) => (
              <div key={aircraft.id} className="flex border-b">
                <div className="w-20 min-w-[5rem] shrink-0 border-r p-2">
                  <div className="text-sm font-medium">{aircraft.registration}</div>
                </div>
                <div className="relative flex-1">
                  <div className="flex">
                    {TIME_SLOTS.map(({ hour, minutes }) => (
                      <div
                        key={`${hour}-${minutes}`}
                        className={cn(
                          "w-6 h-12 border-r relative cursor-pointer",
                          {
                            "border-r-2 border-r-gray-200": shouldShowBorder(hour, minutes),
                            "border-r-gray-100": !shouldShowBorder(hour, minutes),
                            "bg-gray-100": isNightTime(hour, minutes),
                            "bg-sky-100": isSlotSelected(hour, minutes, aircraft.id),
                            "hover:bg-slate-50": !isNightTime(hour, minutes) && !isSlotSelected(hour, minutes, aircraft.id),
                          }
                        )}
                        onMouseDown={() => handleMouseDown(hour, minutes, aircraft.id)}
                        onMouseMove={() => handleMouseMove(hour, minutes)}
                        onMouseUp={handleMouseUp}
                      >
                        {isFirstNightSlot(hour, minutes) && (
                          <div className="absolute -top-2 left-0 w-full flex items-center justify-center">
                            <Moon className="w-3 h-3 text-gray-400" />
                          </div>
                        )}
                        {isFirstSelectedSlot(hour, minutes, aircraft.id) && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-xs text-gray-500 bg-white/75 px-1 rounded">
                              {format(selectedTimeSlot?.start || '', 'HH:mm')} - {format(selectedTimeSlot?.end || '', 'HH:mm')}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Réservations */}
                  {getReservationsForAircraft(aircraft.id).map((reservation) => {
                    const style = calculateReservationStyle(reservation);
                    if (!style) return null;

                    const status = getReservationStatus(reservation);
                    const pilot = users.find((u) => u.id === reservation.pilotId);

                    return (
                      <button
                        key={reservation.id}
                        onClick={() => handleReservationClick(reservation)}
                        className={cn(
                          "absolute top-0 h-12 rounded px-2 text-xs font-medium transition-colors",
                          {
                            "bg-sky-100 hover:bg-sky-200": status === "future",
                            "bg-gray-100 hover:bg-gray-200": status === "past",
                            "bg-green-100 hover:bg-green-200": status === "current",
                          }
                        )}
                        style={style}
                      >
                        {pilot?.firstName} {pilot?.lastName}
                      </button>
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
