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
import TimeGrid from "./TimeGrid";
import ReservationModal from "./ReservationModal";
import EditReservationModal from "./EditReservationModal";
import FilterPanel, { FilterState } from "./FilterPanel";
import { toast } from "react-hot-toast";
import { validateReservation } from "../../lib/reservationValidation";
import { supabase } from "../../lib/supabase";

const ReservationCalendar = () => {
  const navigate = useNavigate();
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
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    aircraftTypes: [],
    instructors: [],
    status: "all",
    availability: "all",
  });
  const [flights, setFlights] = useState<{ reservationId: string }[]>([]);

  const loadData = async () => {
    const [reservationsData, aircraftData, usersData] = await Promise.all([
      getReservations(),
      getAircraft(),
      getUsers(),
    ]);
    setReservations(reservationsData);
    setAircraft(aircraftData);
    setUsers(usersData);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const loadFlights = async () => {
      const { data } = await supabase
        .from("flights")
        .select("reservation_id")
        .not("reservation_id", "is", null);

      if (data) {
        setFlights(
          data.map((flight) => ({
            reservationId: flight.reservation_id,
          }))
        );
      }
    };

    loadFlights();
  }, []);

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
    setSelectedTimeSlot({
      start,
      end,
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
      await loadData();
      toast.success("Réservation déplacée avec succès");
    } catch (error) {
      toast.error("Erreur lors du déplacement de la réservation");
    }
  };

  const instructors = users.filter((u) => u.role === "INSTRUCTOR");

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
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
          onCreateFlight={handleCreateFlight}
          reservations={filteredReservations}
          aircraft={filteredAircraft}
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
          onSuccess={loadData}
          aircraft={filteredAircraft}
          users={users}
        />
      )}

      {showEditModal && selectedReservation && (
        <EditReservationModal
          reservation={selectedReservation}
          onClose={() => setShowEditModal(false)}
          onUpdate={loadData}
          reservations={reservations}
        />
      )}
    </div>
  );
};

export default ReservationCalendar;
