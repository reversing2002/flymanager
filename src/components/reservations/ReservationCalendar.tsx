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
} from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Filter } from "lucide-react";
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
      await loadInitialData(); // Recharger les données après la mise à jour
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
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Planning des Réservations
          </h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filtres</span>
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePreviousWeek}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            <span className="font-medium">
              {format(startDate, "dd MMMM", { locale: fr })} -{" "}
              {format(addDays(startDate, 6), "dd MMMM yyyy", { locale: fr })}
            </span>
          </div>
          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <ChevronRight className="h-5 w-5" />
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
