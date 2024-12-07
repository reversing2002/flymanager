import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfWeek,
  addDays,
  startOfDay,
  isToday,
  isThisWeek,
  isBefore,
  isAfter,
  subDays,
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
import TimeGrid from "./TimeGrid";
import ReservationModal from "./ReservationModal";
import type { FilterState } from "./FilterPanel";
import { toast } from "react-hot-toast";
import { validateReservation } from "../../lib/reservationValidation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";

interface ReservationCalendarProps {
  filters: FilterState;
}

const ReservationCalendar = ({ filters }: ReservationCalendarProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    start: Date;
    end: Date;
    aircraftId?: string;
  } | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftOrder, setAircraftOrder] = useState<{ [key: string]: number }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [flights, setFlights] = useState<{ reservationId: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les données initiales
  useEffect(() => {
    loadInitialData();
  }, [selectedDate]);

  useEffect(() => {
    if (!reservations) return;

    let filtered = [...reservations];

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
  }, [reservations, filters, aircraft, currentUser]);

  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);

  // Fonction pour charger les données initiales
  const loadInitialData = async () => {
    try {
      // Charger les avions
      const aircraftData = await getAircraft();
      setAircraft(aircraftData);

      // Charger l'ordre des avions
      if (aircraftData[0]?.club_id) {
        const order = await getAircraftOrder(aircraftData[0].club_id);
        setAircraftOrder(order);
      }

      // Charger les réservations
      const startDate = startOfWeek(selectedDate, { locale: fr });
      const endDate = addDays(startDate, 7);
      const reservationsData = await getReservations(startDate, endDate);
      setReservations(reservationsData);

      // Charger les utilisateurs
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast.error("Erreur lors du chargement des données");
    }
  };

  const startDate = startOfWeek(currentDate, { locale: fr });
  const weekDays = [...Array(7)].map((_, i) => addDays(startDate, i));

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(startOfDay(new Date(event.target.value)));
  };

  const handlePreviousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotClick = (start: Date, end: Date, aircraftId: string) => {
    const localStart = new Date(start.getTime());
    const localEnd = new Date(end.getTime());

    setSelectedTimeSlot({
      start: localStart,
      end: localEnd,
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

  const handleCreateFlight = (reservation: Reservation) => {
    const selectedAircraft = aircraft.find(
      (a) => a.id === reservation.aircraftId
    );
    const pilot = users.find((u) => u.id === reservation.userId);
    const instructor = reservation.instructorId
      ? users.find((u) => u.id === reservation.instructorId)
      : undefined;

    // Calculer la durée en minutes
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    console.log("Creating flight from reservation:", {
      reservation,
      aircraft: selectedAircraft,
      pilot,
      instructor,
      duration,
    });

    console.log("Users with roles:", users.map(u => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      roles: u.roles,
      role: u.role
    })));

    navigate("/flights/new", {
      state: {
        reservation,
        selectedAircraft,
        pilot,
        instructor,
        duration,
        date: start.toISOString().split("T")[0],
        users: users.map(u => ({
          ...u,
          roles: u.roles || (u.role === "PILOT" ? ["PILOT"] : 
                           u.role === "INSTRUCTOR" ? ["INSTRUCTOR"] : 
                           u.role === "ADMIN" ? ["ADMIN"] : [])
        })),
        aircraftList: aircraft,
        fromTimeGrid: true,
      },
    });
  };

  const handleReservationUpdate = async (updatedReservation: Reservation) => {
    try {
      await updateReservation(updatedReservation.id, updatedReservation);
      setReservations(prevReservations => {
        return prevReservations.map(reservation => 
          reservation.id === updatedReservation.id ? updatedReservation : reservation
        );
      });
      toast.success("Réservation mise à jour");
    } catch (error) {
      console.error("Error updating reservation:", error);
      toast.error("Erreur lors de la mise à jour de la réservation");
    }
  };

  const handleReservationMove = async (
    reservationId: string,
    updates: { startTime: Date; endTime: Date; aircraftId: string }
  ) => {
    try {
      const validationError = validateReservation(
        updates.startTime,
        updates.endTime,
        updates.aircraftId,
        reservations,
        reservationId
      );

      if (validationError) {
        toast.error(validationError.message);
        return;
      }

      await updateReservation(reservationId, updates);
      await loadInitialData();
      toast.success("Réservation déplacée avec succès");
    } catch (error) {
      toast.error("Erreur lors du déplacement de la réservation");
    }
  };

  const handleAircraftOrderChange = async (newOrder: { [key: string]: number }) => {
    if (!aircraft[0]?.club_id) return;
    
    try {
      await updateAircraftOrder(aircraft[0].club_id, newOrder);
      setAircraftOrder(newOrder);
      // Forcer un rechargement complet des données pour s'assurer que tout est à jour
      await loadInitialData();
      toast.success("Ordre des avions mis à jour");
    } catch (error) {
      console.error("Error updating aircraft order:", error);
      toast.error("Erreur lors de la mise à jour de l'ordre des avions");
    }
  };

  // Filtrer les appareils selon les critères
  const filteredAircraft = aircraft.filter((a) => {
    // Filtre par type d'appareil
    if (
      filters.aircraftTypes.length > 0 &&
      !filters.aircraftTypes.includes(a.type)
    ) {
      return false;
    }

    // Filtre par disponibilité
    if (filters.availability !== "all") {
      const aircraftReservations = reservations.filter(
        (r) => r.aircraftId === a.id
      );

      switch (filters.availability) {
        case "available":
          // Vérifie si l'appareil a une réservation en cours
          return !aircraftReservations.some((r) => {
            const start = new Date(r.startTime);
            const end = new Date(r.endTime);
            return isBefore(start, new Date()) && isAfter(end, new Date());
          });

        case "today":
          // Vérifie si l'appareil a des réservations aujourd'hui
          return !aircraftReservations.some((r) => {
            return isToday(new Date(r.startTime));
          });

        case "week":
          // Vérifie si l'appareil a des réservations cette semaine
          return !aircraftReservations.some((r) => {
            return isThisWeek(new Date(r.startTime), { locale: fr });
          });
      }
    }

    return true;
  });

  const instructors = users.filter((u) => hasAnyGroup({ role: u.role } as User, ["INSTRUCTOR"]));

  return (
    <div className="flex flex-col h-full">
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button onClick={handlePreviousWeek} className="p-2">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="font-medium">
              {format(startDate, "MMMM yyyy", { locale: fr })}
            </span>
          </div>
          <button onClick={handleNextWeek} className="p-2">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <TimeGrid
          selectedDate={selectedDate}
          onTimeSlotClick={handleTimeSlotClick}
          onReservationClick={handleReservationClick}
          onReservationUpdate={handleReservationUpdate}
          onCreateFlight={handleCreateFlight}
          reservations={filteredReservations}
          aircraft={filteredAircraft}
          aircraftOrder={aircraftOrder}
          onAircraftOrderChange={handleAircraftOrderChange}
          users={users}
          flights={flights}
          onDateChange={setSelectedDate}
        />
      </div>

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
        />
      )}
    </div>
  );
};

export default ReservationCalendar;
