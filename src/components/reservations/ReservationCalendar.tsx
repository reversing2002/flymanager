import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  addDays,
  startOfDay,
  isToday,
  isThisWeek,
  isBefore,
  isAfter,
  subDays,
  endOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Aircraft, Reservation, User, Availability } from "../../types/database";
import {
  getAircraft,
  getReservations,
  getUsers,
  updateReservation,
  getAvailabilitiesForPeriod,
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
import SunTimesDisplay from "../common/SunTimesDisplay";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { getSunTimes } from "../../lib/sunTimes";

interface ReservationCalendarProps {
  filters: FilterState;
}

const ReservationCalendar = ({ filters }: ReservationCalendarProps) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfDay(new Date())
  );
  const [currentDate, setCurrentDate] = useState<Date>(startOfDay(new Date()));
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{
    start: Date;
    end: Date;
    aircraftId?: string;
  } | null>(null);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftOrder, setAircraftOrder] = useState<{ [key: string]: number }>(
    {}
  );
  const [users, setUsers] = useState<User[]>([]);
  const [flights, setFlights] = useState<{ reservationId: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [clubSettings, setClubSettings] = useState<{
    night_flights_enabled: boolean;
  } | null>(null);
  const [clubCoordinates, setClubCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  // Charger les données initiales
  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!reservations) return;

    let filtered = [...reservations];

    // Filter reservations based on user role
    if (
      hasAnyGroup(currentUser, ["PILOT"]) &&
      !hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR", "MECHANIC"])
    ) {
      filtered = filtered.filter((r) => r.userId === currentUser.id);
    }

    // Apply filters
    if (filters.aircraftTypes.length > 0) {
      filtered = filtered.filter((r) => {
        const aircraftType = aircraft.find((a) => a.id === r.aircraftId)?.type;
        return filters.aircraftTypes.includes(aircraftType || "");
      });
    }

    if (filters.instructors.length > 0) {
      filtered = filtered.filter((r) =>
        filters.instructors.includes(r.instructorId || "")
      );
    }

    if (filters.status !== "all") {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    if (filters.availability !== "all") {
      switch (filters.availability) {
        case "available":
          filtered = filtered.filter((r) => {
            const start = new Date(r.startTime);
            const end = new Date(r.endTime);
            return !isBefore(start, new Date()) && !isAfter(end, new Date());
          });
          break;
        case "today":
          filtered = filtered.filter((r) => isToday(new Date(r.startTime)));
          break;
        case "week":
          filtered = filtered.filter((r) =>
            isThisWeek(new Date(r.startTime), { locale: fr })
          );
          break;
      }
    }

    setFilteredReservations(filtered);
  }, [reservations, filters, aircraft, currentUser]);

  const [filteredReservations, setFilteredReservations] = useState<
    Reservation[]
  >([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reservationsData, aircraftData, usersData, availabilitiesData] = await Promise.all([
        getReservations(selectedDate),
        getAircraft(),
        getUsers(),
        getAvailabilitiesForPeriod(
          startOfDay(selectedDate).toISOString(),
          endOfDay(selectedDate).toISOString(),
          null,
          filters.aircraftId
        ),
      ]);

      setReservations(reservationsData);
      setAircraft(aircraftData);
      setUsers(usersData);
      setAvailabilities(availabilitiesData);

      // Charger l'ordre des avions
      const order = await getAircraftOrder(currentUser?.club?.id || "");
      setAircraftOrder(order);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(startOfDay(new Date(event.target.value)));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeSlotClick = (start: Date, end: Date, aircraftId: string) => {
    if (!isTimeSlotAvailable(start, end, aircraftId)) {
      // Suppression du toast ici car il est maintenant géré dans le TimeGrid
      return;
    }
    
    setSelectedTimeSlot({ start, end, aircraftId });
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
    const duration = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60)
    );

    console.log("Creating flight from reservation:", {
      reservation,
      aircraft: selectedAircraft,
      pilot,
      instructor,
      duration,
    });

    console.log(
      "Users with roles:",
      users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        roles: u.roles,
        role: u.role,
      }))
    );

    navigate("/flights/new", {
      state: {
        reservation,
        selectedAircraft,
        pilot,
        instructor,
        duration,
        date: start.toISOString().split("T")[0],
        users: users.map((u) => ({
          ...u,
          roles:
            u.roles ||
            (u.role === "PILOT"
              ? ["PILOT"]
              : u.role === "INSTRUCTOR"
              ? ["INSTRUCTOR"]
              : u.role === "ADMIN"
              ? ["ADMIN"]
              : []),
        })),
        aircraftList: aircraft,
        fromTimeGrid: true,
      },
    });
  };

  const handleReservationUpdate = async (updatedReservation: Reservation) => {
    try {
      await updateReservation(updatedReservation.id, updatedReservation);
      setReservations((prevReservations) => {
        return prevReservations.map((reservation) =>
          reservation.id === updatedReservation.id
            ? updatedReservation
            : reservation
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
      await loadData();
      toast.success("Réservation déplacée avec succès");
    } catch (error) {
      toast.error("Erreur lors du déplacement de la réservation");
    }
  };

  const handleAircraftOrderChange = async (newOrder: {
    [key: string]: number;
  }) => {
    if (!aircraft[0]?.club_id) return;

    try {
      await updateAircraftOrder(aircraft[0].club_id, newOrder);
      setAircraftOrder(newOrder);
      // Forcer un rechargement complet des données pour s'assurer que tout est à jour
      await loadData();
      toast.success("Ordre des avions mis à jour");
    } catch (error) {
      console.error("Error updating aircraft order:", error);
      toast.error("Erreur lors de la mise à jour de l'ordre des avions");
    }
  };

  const isTimeSlotAvailable = (start: Date, end: Date, aircraftId: string) => {
    // Vérifier les indisponibilités
    const hasConflictingAvailability = availabilities.some((availability) => {
      if (availability.aircraft_id && availability.aircraft_id !== aircraftId) {
        return false;
      }
      
      const availStart = new Date(availability.start_time);
      const availEnd = new Date(availability.end_time);
      
      return (
        (start >= availStart && start < availEnd) ||
        (end > availStart && end <= availEnd) ||
        (start <= availStart && end >= availEnd)
      );
    });

    if (hasConflictingAvailability) {
      return false;
    }

    // Vérifier les réservations existantes
    const hasConflictingReservation = reservations.some((reservation) => {
      if (reservation.aircraftId !== aircraftId) {
        return false;
      }
      
      const resStart = new Date(reservation.startTime);
      const resEnd = new Date(reservation.endTime);
      
      return (
        (start >= resStart && start < resEnd) ||
        (end > resStart && end <= resEnd) ||
        (start <= resStart && end >= resEnd)
      );
    });

    return !hasConflictingReservation;
  };

  // Charger les coordonnées du club
  useEffect(() => {
    const loadClubCoordinates = async () => {
      if (!currentUser?.club?.id) return;

      const { data: clubData } = await supabase
        .from('clubs')
        .select('latitude, longitude')
        .eq('id', currentUser.club.id)
        .single();

      if (clubData?.latitude && clubData?.longitude) {
        setClubCoordinates({
          latitude: clubData.latitude,
          longitude: clubData.longitude
        });
      }
    };

    loadClubCoordinates();
  }, [currentUser?.club?.id]);

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

  const instructors = users.filter((u) =>
    hasAnyGroup({ role: u.role } as User, ["INSTRUCTOR"])
  );

  // Ajouter l'effet pour charger les paramètres du club
  useEffect(() => {
    const loadClubSettings = async () => {
      if (!currentUser?.club?.id) return;

      const { data: clubData, error } = await supabase
        .from("clubs")
        .select("night_flights_enabled")
        .eq("id", currentUser.club.id)
        .single();

      if (error) {
        console.error("Error loading club settings:", error);
        return;
      }

      if (clubData) {
        setClubSettings(clubData);
      }
    };

    loadClubSettings();
  }, [currentUser?.club?.id]);

  return (
    <div className="flex flex-col h-full">
      {/* En-tête avec navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <button
              onClick={handlePreviousDay}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-lg"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="font-medium">
                  {format(selectedDate, "EEEE d MMMM", { locale: fr })}
                </span>
              </button>
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(startOfDay(date));
                        setShowDatePicker(false);
                      }
                    }}
                    locale={fr}
                    className="p-3"
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <SunTimesDisplay
            sunTimes={clubCoordinates ? getSunTimes(selectedDate, clubCoordinates.latitude, clubCoordinates.longitude) : null}
            variant="compact"
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

      <div className="flex-1 overflow-auto">
        <TimeGrid
          selectedDate={selectedDate}
          onTimeSlotClick={handleTimeSlotClick}
          onReservationClick={handleReservationClick}
          onReservationUpdate={handleReservationUpdate}
          onCreateFlight={handleCreateFlight}
          reservations={filteredReservations}
          availabilities={availabilities}
          aircraft={filteredAircraft}
          aircraftOrder={aircraftOrder}
          onAircraftOrderChange={handleAircraftOrderChange}
          users={users}
          flights={flights}
          onDateChange={setSelectedDate}
          nightFlightsEnabled={clubSettings?.night_flights_enabled || false}
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
          onSuccess={loadData}
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
