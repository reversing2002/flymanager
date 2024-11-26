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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
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
import EditReservationModal from "./EditReservationModal";
import FilterPanel, { FilterState } from "./FilterPanel";
import { toast } from "react-hot-toast";
import { validateReservation } from "../../lib/reservationValidation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

const ReservationCalendar = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  const [showFilters, setShowFilters] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    start: Date;
    end: Date;
    aircraftId?: string;
  } | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftOrder, setAircraftOrder] = useState<{ [key: string]: number }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    aircraftTypes: [],
    instructors: [],
    status: "all",
    availability: "all",
  });
  const [flights, setFlights] = useState<{ reservationId: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les données initiales
  useEffect(() => {
    loadInitialData();
  }, [selectedDate]);

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
    // Créer des dates locales en préservant les heures exactes
    const localStart = new Date(start.getTime());
    const localEnd = new Date(end.getTime());

    setSelectedTimeSlot({
      start: localStart,
      end: localEnd,
      aircraftId,
    });
    setShowReservationModal(true);
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowEditModal(true);
  };

  const handleCreateFlight = (reservation: Reservation) => {
    const selectedAircraft = aircraft.find(
      (a) => a.id === reservation.aircraftId
    );
    const pilot = users.find((u) => u.id === reservation.userId);
    const instructor = reservation.instructorId
      ? users.find((u) => u.id === reservation.instructorId)
      : undefined;

    console.log("Creating flight from reservation:", {
      reservation,
      aircraft: selectedAircraft,
      pilot,
      instructor,
    });

    navigate("/flights/new", {
      state: {
        reservation,
        aircraft: selectedAircraft,
        pilot,
        instructor,
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

  // Filtrer les réservations selon les critères
  const filteredReservations = reservations.filter((reservation) => {
    // Filtre par instructeur
    if (
      filters.instructors.length > 0 &&
      !filters.instructors.includes(reservation.instructorId || "")
    ) {
      return false;
    }

    // Filtre par type d'appareil
    const aircraftType = aircraft.find(
      (a) => a.id === reservation.aircraftId
    )?.type;
    if (
      filters.aircraftTypes.length > 0 &&
      aircraftType &&
      !filters.aircraftTypes.includes(aircraftType)
    ) {
      return false;
    }

    return true;
  });

  const instructors = users.filter((u) => u.role === "INSTRUCTOR");

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border-b gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={handlePreviousDay}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Jour précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-2 cursor-pointer">
              <input
                type="date"
                value={format(selectedDate, "yyyy-MM-dd")}
                onChange={handleDateChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                aria-label="Sélectionner une date"
              />
              <span className="text-lg font-semibold hidden sm:inline">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })}
              </span>
              <span className="text-lg font-semibold sm:hidden">
                {format(selectedDate, "EEE d MMM", { locale: fr })}
              </span>
              <CalendarIcon className="w-5 h-5 text-gray-500 hover:text-gray-700 flex-shrink-0" />
            </div>
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Jour suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(startOfDay(new Date()))}
            className={`px-3 py-1.5 rounded-md text-sm ${
              isToday(selectedDate)
                ? "bg-blue-100 text-blue-700"
                : "hover:bg-gray-100"
            }`}
          >
            Aujourd'hui
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-100 rounded-md"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtres</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <FilterPanel
          onClose={() => setShowFilters(false)}
          onFiltersChange={setFilters}
          aircraft={aircraft}
          instructors={instructors}
          filters={filters}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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

      {showReservationModal && selectedTimeSlot && (
        <ReservationModal
          startTime={selectedTimeSlot.start}
          endTime={selectedTimeSlot.end}
          preselectedAircraftId={selectedTimeSlot.aircraftId}
          onClose={() => setShowReservationModal(false)}
          onSuccess={loadInitialData}
          aircraft={filteredAircraft}
          users={users}
        />
      )}

      {showEditModal && selectedReservation && (
        <EditReservationModal
          reservation={selectedReservation}
          onClose={() => setShowEditModal(false)}
          onUpdate={loadInitialData}
          reservations={reservations}
        />
      )}
    </div>
  );
};

export default ReservationCalendar;
