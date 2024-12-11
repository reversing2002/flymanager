import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfDay,
  isToday,
  isThisWeek,
  isBefore,
  isAfter,
  setHours,
  setMinutes,
  addMinutes,
  subDays,
  addDays,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import type { Aircraft, Reservation, User } from "../../types/database";
import {
  getAircraft,
  getReservations,
  getUsers,
  updateReservation,
} from "../../lib/queries";
import { getAircraftOrder } from "../../services/aircraft";
import ReservationModal from "./ReservationModal";
import { toast } from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { cn } from "../../lib/utils";
import SunTimesDisplay from "../common/SunTimesDisplay";
import { getSunTimes } from "../../lib/sunTimes";
import { FilterState } from "./FilterPanel";

// Générer les intervalles de 15 minutes
const generateTimeSlots = (
  date: Date,
  nightFlightsEnabled: boolean,
  coordinates: { latitude: number; longitude: number } | null
) => {
  const sunTimes = coordinates
    ? getSunTimes(date, coordinates.latitude, coordinates.longitude)
    : null;

  let startMinutes, endMinutes;

  if (sunTimes) {
    // Convertir en minutes pour plus de précision
    startMinutes =
      sunTimes.aeroStart.getHours() * 60 + sunTimes.aeroStart.getMinutes();
    endMinutes =
      sunTimes.aeroEnd.getHours() * 60 + sunTimes.aeroEnd.getMinutes();

    // Arrondir au quart d'heure inférieur pour le début
    startMinutes = Math.floor(startMinutes / 15) * 15;
    // Arrondir au quart d'heure supérieur pour la fin
    endMinutes = Math.ceil(endMinutes / 15) * 15;
  } else {
    // Valeurs par défaut si pas de coordonnées
    startMinutes = 7 * 60; // 7h00
    endMinutes = nightFlightsEnabled ? 21 * 60 : 18 * 60; // 21h00 ou 18h00
  }

  const startHour = Math.floor(startMinutes / 60);
  const endHour = Math.ceil(endMinutes / 60);

  console.log("=== Debug Time Slots Generation ===");
  console.log("Date:", date);
  console.log("Night flights enabled:", nightFlightsEnabled);
  console.log("Club coordinates:", coordinates);
  console.log("Sun times:", sunTimes);
  console.log(
    "Start minutes:",
    startMinutes,
    "(",
    Math.floor(startMinutes / 60),
    "h",
    startMinutes % 60,
    ")"
  );
  console.log(
    "End minutes:",
    endMinutes,
    "(",
    Math.floor(endMinutes / 60),
    "h",
    endMinutes % 60,
    ")"
  );

  const slots = [];
  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 15) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    slots.push({ hour, minutes: minute });
  }

  return slots;
};

interface HorizontalReservationCalendarProps {
  filters: FilterState;
}

const HorizontalReservationCalendar = ({
  filters,
}: HorizontalReservationCalendarProps) => {
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
  const [filteredReservations, setFilteredReservations] = useState<
    Reservation[]
  >([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftOrder, setAircraftOrder] = useState<{ [key: string]: number }>(
    {}
  );
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

  const [clubCoordinates, setClubCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [clubSettings, setClubSettings] = useState<{
    night_flights_enabled: boolean;
  } | null>(null);
  const [timeSlots, setTimeSlots] = useState<
    { hour: number; minutes: number }[]
  >([]);

  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const loadClubSettings = async () => {
      if (!currentUser?.club?.id) {
        console.log("No club ID found");
        return;
      }

      console.log("=== Debug Club Settings Load ===");
      console.log("Club ID:", currentUser.club.id);

      const { data: clubData, error } = await supabase
        .from("clubs")
        .select("night_flights_enabled, latitude, longitude")
        .eq("id", currentUser.club.id)
        .single();

      if (error) {
        console.error("Error loading club settings:", error);
        return;
      }

      console.log("Club data:", clubData);

      if (clubData) {
        console.log("Setting club settings:", clubData);
        setClubSettings(clubData);
        setClubCoordinates({
          latitude: clubData.latitude,
          longitude: clubData.longitude,
        });
        const slots = generateTimeSlots(
          selectedDate,
          clubData.night_flights_enabled,
          { latitude: clubData.latitude, longitude: clubData.longitude }
        );
        console.log("Setting time slots:", slots);
        setTimeSlots(slots);
      }
    };

    loadClubSettings();
  }, [currentUser?.club?.id, selectedDate]);

  // Fallback aux créneaux par défaut si aucun créneau n'est chargé
  useEffect(() => {
    if (timeSlots.length === 0) {
      console.log("No time slots loaded, using default slots");
      const defaultSlots = generateTimeSlots(true, null);
      setTimeSlots(defaultSlots);
    }
  }, [timeSlots]);

  useEffect(() => {
    const loadClubCoordinates = async () => {
      if (!currentUser?.club?.id) return;

      const { data: clubData } = await supabase
        .from("clubs")
        .select("latitude, longitude")
        .eq("id", currentUser.club.id)
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
    filtered = filtered.filter((r) => {
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

      // Ajuster les heures pour la requête en UTC
      const startTime = new Date(selectedDate);
      startTime.setHours(7, 0, 0, 0);
      const endTime = new Date(selectedDate);
      endTime.setHours(22, 0, 0, 0);

      const reservationsData = await getReservations(startTime, endTime);
      setReservations(reservationsData);

      const usersData = await getUsers();
      console.log("Loaded users:", usersData);
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

    if (typeof endHour === "number" && typeof endMinutes === "number") {
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
    return filteredReservations.filter((r) => r.aircraftId === aircraftId);
  };

  // Constantes pour les dimensions de la grille
  const CELL_WIDTH = 24; // Réduire encore plus la largeur des cellules
  const START_HOUR = 7;

  const calculateReservationStyle = (reservation: Reservation) => {
    // Convertir explicitement les dates UTC en local
    const start = new Date(reservation.startTime);
    const end = new Date(reservation.endTime);
    
    // Obtenir les heures locales
    const startHour = start.getHours();
    const startMinutes = start.getMinutes();
    const endHour = end.getHours();
    const endMinutes = end.getMinutes();

    // Debug
    console.log('Reservation time debug:', {
      startUTC: reservation.startTime,
      endUTC: reservation.endTime,
      startLocal: start.toLocaleString(),
      endLocal: end.toLocaleString(),
      startHour,
      startMinutes,
      endHour,
      endMinutes
    });
    
    // Calculer le nombre de créneaux depuis le début de la journée (7h)
    const startMinutesSinceMidnight = startHour * 60 + startMinutes;
    const endMinutesSinceMidnight = endHour * 60 + endMinutes;
    const startMinutesSince7am = startMinutesSinceMidnight - (7 * 60);
    const endMinutesSince7am = endMinutesSinceMidnight - (7 * 60);
    
    if (startMinutesSince7am < 0) {
      return null;
    }

    // Ajuster la position en soustrayant une cellule (15 minutes)
    const left = ((startMinutesSince7am - 15) / 15) * CELL_WIDTH;
    const width = Math.max(((endMinutesSince7am - startMinutesSince7am) / 15) * CELL_WIDTH, CELL_WIDTH);

    return {
      left: `${left}px`,
      width: `${width}px`,
      position: 'absolute',
      height: '2.5rem',
      top: '0.25rem',
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
    // Afficher les heures pleines et les quarts d'heure
    return minutes % 15 === 0;
  };

  // Fonction pour formater l'heure
  const formatHour = (hour: number, minutes: number) => {
    return `${hour}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;
  };

  // Fonction pour déterminer si on doit afficher la bordure pour ce créneau
  const shouldShowBorder = (hour: number, minutes: number) => {
    // Afficher une bordure plus marquée pour chaque heure pleine
    return minutes === 0;
  };

  const isNightTime = (hour: number, minute: number) => {
    if (!clubCoordinates) return false;

    const slotTime = setMinutes(setHours(new Date(selectedDate), hour), minute);
    const sunTimes = getSunTimes(
      selectedDate,
      clubCoordinates.latitude,
      clubCoordinates.longitude
    );
    return slotTime < sunTimes.aeroStart || slotTime > sunTimes.aeroEnd;
  };

  const isFirstNightSlot = (hour: number, minute: number) => {
    if (!clubCoordinates) return false;

    const slotTime = setMinutes(setHours(new Date(selectedDate), hour), minute);
    const prevSlotTime = new Date(slotTime);
    prevSlotTime.setMinutes(prevSlotTime.getMinutes() - 15);

    const sunTimes = getSunTimes(
      selectedDate,
      clubCoordinates.latitude,
      clubCoordinates.longitude
    );
    return slotTime > sunTimes.aeroEnd && prevSlotTime <= sunTimes.aeroEnd;
  };

  const isFirstSelectedSlot = (
    hour: number,
    minutes: number,
    aircraftId: string
  ) => {
    if (!selectedTimeSlot || selectedTimeSlot.aircraftId !== aircraftId)
      return false;

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
    const duration = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60)
    );

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

  const handleMouseDown = (
    hour: number,
    minutes: number,
    aircraftId: string
  ) => {
    // Vérifier si une réservation existe déjà à cet emplacement
    const existingReservation = filteredReservations.find((r) => {
      const slotTime = setMinutes(setHours(selectedDate, hour), minutes);
      const start = new Date(r.startTime);
      const end = new Date(r.endTime);
      return slotTime >= start && slotTime < end && r.aircraftId === aircraftId;
    });

    // Ne pas démarrer la sélection s'il y a déjà une réservation
    if (existingReservation) return;

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

    // Vérifier si on est toujours sur le même avion
    const currentSlot = document.elementFromPoint(
      event?.clientX || 0,
      event?.clientY || 0
    );
    const aircraftRow = currentSlot?.closest("[data-aircraft-id]");
    if (
      !aircraftRow ||
      aircraftRow.getAttribute("data-aircraft-id") !== selectionStart.aircraftId
    ) {
      return;
    }

    setSelectionEnd({ hour, minute: minutes });

    // Calculer le début et la fin de la sélection
    let startTime = new Date(selectedDate);
    let endTime = new Date(selectedDate);

    if (
      hour < selectionStart.hour ||
      (hour === selectionStart.hour && minutes < selectionStart.minute)
    ) {
      startTime.setHours(hour, minutes, 0, 0);
      endTime.setHours(selectionStart.hour, selectionStart.minute + 15, 0, 0);
    } else {
      startTime.setHours(selectionStart.hour, selectionStart.minute, 0, 0);
      endTime.setHours(hour, minutes + 15, 0, 0);
    }

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

  const isSlotSelected = (
    hour: number,
    minutes: number,
    aircraftId: string
  ) => {
    if (!selectedTimeSlot || selectedTimeSlot.aircraftId !== aircraftId)
      return false;

    const slotTime = new Date(selectedDate);
    slotTime.setHours(hour, minutes, 0, 0);

    return (
      slotTime >= selectedTimeSlot.start && slotTime < selectedTimeSlot.end
    );
  };

  // Fonction utilitaire pour trouver l'index du créneau horaire
  const findTimeSlotIndex = (hour: number, minutes: number) => {
    return (hour - 7) * 4 + (minutes / 15);
  };

  const timeSlotStyle = (hour: number, minutes: number, aircraftId: string) => {
    return cn(
      "h-12 border-r border-gray-200 flex-shrink-0",
      {
        "border-r-2 border-r-gray-300": shouldShowBorder(hour, minutes),
        "bg-gray-50": isNightTime(hour, minutes),
        "bg-blue-100": isSlotSelected(hour, minutes, aircraftId)
      },
      "w-6" // Ajouter une largeur fixe
    );
  };

  const hourHeaderStyle = (hour: number, minutes: number) => {
    return cn(
      "flex-shrink-0 h-8 border-r border-gray-200 text-xs text-gray-500 flex items-center justify-center",
      shouldShowBorder(hour, minutes) && "border-r-2 border-r-gray-300",
      "w-6" // Ajouter une largeur fixe
    );
  };

  const CurrentTimeLine = ({ selectedDate }: { selectedDate: Date }) => {
    const [position, setPosition] = useState<number>(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const updatePosition = () => {
        const now = new Date();
        if (!isToday(selectedDate)) return;

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute; // Temps en minutes

        // Obtenir les heures aéronautiques précises
        const sunTimes = clubCoordinates
          ? getSunTimes(
              selectedDate,
              clubCoordinates.latitude,
              clubCoordinates.longitude
            )
          : null;

        if (!sunTimes) {
          setIsVisible(false);
          return;
        }

        // Convertir les heures aéronautiques en minutes pour une comparaison précise
        const aeroStartMinutes =
          sunTimes.aeroStart.getHours() * 60 + sunTimes.aeroStart.getMinutes();
        const aeroEndMinutes =
          sunTimes.aeroEnd.getHours() * 60 + sunTimes.aeroEnd.getMinutes();

        // Masquer la ligne si hors limites de la journée aéronautique
        if (currentTime < aeroStartMinutes || currentTime > aeroEndMinutes) {
          setIsVisible(false);
          return;
        }

        setIsVisible(true);

        // Calculer la position en pixels
        const hoursSinceStart = currentHour - START_HOUR;
        const minutePercentage = currentMinute / 60;
        const position =
          (hoursSinceStart + minutePercentage) * (CELL_WIDTH * 4);

        setPosition(position);
      };

      updatePosition();
      const interval = setInterval(updatePosition, 60000);

      return () => clearInterval(interval);
    }, [selectedDate, clubCoordinates]);

    if (!isToday(selectedDate) || !isVisible) return null;

    return (
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-20 pointer-events-none"
        style={{
          left: `${position}px`,
          opacity: 0.75,
        }}
      />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header avec la date */}
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
                className="flex items-center space-x-2 px-3 py-2 hover:bg-slate-100 rounded-lg"
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
            sunTimes={clubCoordinates
              ? getSunTimes(
                  selectedDate,
                  clubCoordinates.latitude,
                  clubCoordinates.longitude
                )
              : null}
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

      {/* Grille des réservations */}
      <div className="relative flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Colonne fixe avec les noms des appareils */}
          <div className="sticky left-0 z-10 bg-white border-r border-gray-200 shadow-sm">
            <div className="h-8" />{" "}
            {/* Espace pour aligner avec l'en-tête des heures */}
            <div className="flex flex-col">
              {sortedAircraft.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center h-12 px-2 border-b border-gray-200 bg-white"
                  style={{ minWidth: "120px", width: "120px" }}
                >
                  <span className="font-medium truncate">{a.registration}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grille scrollable */}
          <div className="flex-1 overflow-x-auto">
            <div className="relative">
              {/* En-tête des heures */}
              <div className="flex h-8 border-b border-gray-200">
                {timeSlots.map(({ hour, minutes }, index) => (
                  <div
                    key={index}
                    className={hourHeaderStyle(hour, minutes)}
                  >
                    {minutes === 0 && hour}
                  </div>
                ))}
              </div>

              {/* Ligne de l'heure actuelle */}
              <CurrentTimeLine selectedDate={selectedDate} />

              {/* Grille des réservations */}
              <div className="relative">
                {sortedAircraft.map((aircraft, aircraftIndex) => (
                  <div
                    key={aircraft.id}
                    className="relative flex h-12 border-b border-gray-200"
                    data-aircraft-id={aircraft.id}
                  >
                    {/* Créneaux horaires */}
                    {timeSlots.map(({ hour, minutes }, index) => (
                      <div
                        key={index}
                        className={timeSlotStyle(hour, minutes, aircraft.id)}
                        onMouseDown={() => handleMouseDown(hour, minutes, aircraft.id)}
                        onMouseEnter={() => handleMouseMove(hour, minutes)}
                        onMouseUp={handleMouseUp}
                      />
                    ))}

                    {/* Réservations pour cet avion */}
                    <div className="absolute inset-0 pointer-events-none">
                      {filteredReservations
                        .filter((r) => r.aircraftId === aircraft.id)
                        .map((reservation) => {
                          const pilot = users.find((u) => u.id === reservation.pilotId);
                          const instructor = reservation.instructorId
                            ? users.find((u) => u.id === reservation.instructorId)
                            : null;

                          // Déterminer les couleurs en fonction du type de réservation
                          let bgColor, textColor, borderColor;
                          if (reservation.hasAssociatedFlight) {
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

                          const style = calculateReservationStyle(reservation);
                          if (!style) return null;

                          return (
                            <button
                              key={reservation.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReservationClick(reservation);
                              }}
                              className={cn(
                                "absolute h-10 rounded px-2 text-xs font-medium transition-all shadow-sm border pointer-events-auto",
                                bgColor,
                                textColor,
                                borderColor,
                                "hover:shadow-md hover:scale-[1.02]"
                              )}
                              style={style}
                            >
                              <div className="p-1">
                                <div className="mt-1 line-clamp-1">
                                  {(pilot?.first_name || "Pilote").substring(0, 10)}
                                  {instructor && (
                                    <>
                                      {" + "}
                                      {(instructor.first_name || "Instructeur").substring(0, 10)}
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
