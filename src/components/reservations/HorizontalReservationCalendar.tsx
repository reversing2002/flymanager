import { useState, useEffect, useMemo } from "react";
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
  parseISO,
  getHours,
  getMinutes,
  endOfDay,
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
import type { Availability } from "../../types/availability";
import {
  getAircraft,
  getReservations,
  getUsers,
  updateReservation,
} from "../../lib/queries";
import { getAvailabilitiesForPeriod } from "../../lib/queries/availability";
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
  filters = { instructors: [], aircraft: [], types: [] },
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

  const [instructorAvailabilities, setInstructorAvailabilities] = useState<Availability[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);

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
    const loadInstructorAvailabilities = async () => {
      if (!filters?.instructors || !Array.isArray(filters.instructors) || filters.instructors.length === 0) {
        setInstructorAvailabilities([]);
        return;
      }

      try {
        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);

        const availabilitiesPromises = filters.instructors.map(instructorId =>
          getAvailabilitiesForPeriod(
            dayStart.toISOString(),
            dayEnd.toISOString(),
            instructorId
          )
        );

        const allAvailabilities = await Promise.all(availabilitiesPromises);
        setInstructorAvailabilities(allAvailabilities.flat());
      } catch (error) {
        console.error('Error loading instructor availabilities:', error);
        toast.error('Erreur lors du chargement des disponibilités des instructeurs');
      }
    };

    loadInstructorAvailabilities();
  }, [filters.instructors, selectedDate]);

  useEffect(() => {
    const loadAvailabilities = async () => {
      if (!currentUser?.club?.id) return;

      try {
        const dayStart = startOfDay(selectedDate);
        const dayEnd = endOfDay(selectedDate);

        const availabilities = await getAvailabilitiesForPeriod(
          dayStart.toISOString(),
          dayEnd.toISOString(),
          currentUser.club.id
        );

        setAvailabilities(availabilities);
      } catch (error) {
        console.error('Error loading availabilities:', error);
        toast.error('Erreur lors du chargement des indisponibilités');
      }
    };

    loadAvailabilities();
  }, [currentUser?.club?.id, selectedDate]);

  useEffect(() => {
    const loadInstructors = async () => {
      if (!filters?.instructors?.length) {
        setInstructors([]);
        return;
      }

      try {
        const instructorsData = await getUsers();
        const filteredInstructors = instructorsData.filter(user => 
          filters.instructors?.includes(user.id) && 
          hasAnyGroup({ role: user.role } as User, ["INSTRUCTOR"])
        );
        setInstructors(filteredInstructors);
      } catch (error) {
        console.error('Error loading instructors:', error);
        toast.error('Erreur lors du chargement des instructeurs');
      }
    };

    loadInstructors();
  }, [filters.instructors]);

  const loadInitialData = async () => {
    try {
      const aircraftData = await getAircraft();
      const userData = await getUsers();

      // Filtrer les appareils disponibles uniquement
      const availableAircraft = aircraftData.filter(a => a.status === "AVAILABLE");
      setAircraft(availableAircraft);
      setUsers(userData);

      // Charger l'ordre des appareils seulement si on a un club_id
      if (currentUser?.club?.id) {
        const order = await getAircraftOrder(currentUser.club.id);
        setAircraftOrder(order);
      }

      // Ajuster les heures pour la requête
      const startTime = startOfDay(selectedDate);
      const endTime = endOfDay(selectedDate);

      console.log('Fetching reservations for:', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        selectedDate: selectedDate.toISOString()
      });

      const reservationsData = await getReservations(startTime, endTime);
      setReservations(reservationsData);
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

  const sortedAircraft = useMemo(() => {
    return [...aircraft].sort((a, b) => {
      return (aircraftOrder[a.id] || 0) - (aircraftOrder[b.id] || 0);
    });
  }, [aircraft, aircraftOrder]);

  const filteredReservations = useMemo(() => {
    let filtered = [...reservations];

    if (filters?.aircraftTypes?.length > 0) {
      filtered = filtered.filter((r) =>
        filters.aircraftTypes.includes(r.aircraftId)
      );
    }

    if (filters?.instructors?.length > 0) {
      filtered = filtered.filter((r) =>
        filters.instructors.includes(r.instructorId || '')
      );
    }

    if (filters?.status && filters.status !== "all") {
      filtered = filtered.filter((r) => r.status === filters.status);
    }

    return filtered;
  }, [filters, reservations]);

  const filteredAircraft = useMemo(() => {
    if (!filters?.aircraftTypes?.length) return aircraft;
    return aircraft.filter((a) => filters.aircraftTypes.includes(a.id));
  }, [aircraft, filters?.aircraftTypes]);

  const filteredInstructors = useMemo(() => {
    return instructors.filter(instructor => 
      filters.instructors?.includes(instructor.id)
    );
  }, [instructors, filters.instructors]);

  const getReservationsForAircraft = (aircraftId: string) => {
    return filteredReservations.filter((r) => r.aircraftId === aircraftId);
  };

  // Constantes pour les dimensions de la grille
  const CELL_WIDTH = 24; // Réduire encore plus la largeur des cellules
  const START_HOUR = 7;

  const calculateReservationStyle = (reservation: Reservation) => {
    // Obtenir l'heure de début aéronautique
    const sunTimes = clubCoordinates
      ? getSunTimes(selectedDate, clubCoordinates.latitude, clubCoordinates.longitude)
      : null;

    // Calculer l'heure de début du planning en minutes (même logique que generateTimeSlots)
    let planningStartMinutes;
    if (sunTimes) {
      planningStartMinutes =
        sunTimes.aeroStart.getHours() * 60 + sunTimes.aeroStart.getMinutes();
      // Arrondir au quart d'heure inférieur comme dans generateTimeSlots
      planningStartMinutes = Math.floor(planningStartMinutes / 15) * 15;
    } else {
      planningStartMinutes = START_HOUR * 60;
    }

    // Convertir les dates UTC en local
    const startDate = new Date(reservation.startTime);
    const endDate = new Date(reservation.endTime);

    // Obtenir les heures et minutes locales
    const startHour = startDate.getHours();
    const startMinutes = startDate.getMinutes();
    const endHour = endDate.getHours();
    const endMinutes = endDate.getMinutes();

    // Debug
    console.log('Reservation time debug:', {
      startUTC: reservation.startTime,
      endUTC: reservation.endTime,
      startLocal: startDate.toLocaleString(),
      endLocal: endDate.toLocaleString(),
      planningStartMinutes,
      startHour,
      startMinutes,
      endHour,
      endMinutes
    });
    
    // Calculer le nombre de minutes depuis le début du planning
    const startMinutesSinceMidnight = startHour * 60 + startMinutes;
    const endMinutesSinceMidnight = endHour * 60 + endMinutes;

    // Arrondir les minutes au quart d'heure le plus proche pour l'alignement
    const roundedStartMinutes = Math.round(startMinutesSinceMidnight / 15) * 15;
    const roundedEndMinutes = Math.round(endMinutesSinceMidnight / 15) * 15;
    
    const startMinutesSincePlanningStart = roundedStartMinutes - planningStartMinutes;
    const endMinutesSincePlanningStart = roundedEndMinutes - planningStartMinutes;
    
    if (startMinutesSincePlanningStart < 0) {
      return null;
    }

    // Calculer la position et la largeur en pixels
    const left = (startMinutesSincePlanningStart / 15) * CELL_WIDTH;
    const width = Math.max(
      ((endMinutesSincePlanningStart - startMinutesSincePlanningStart) / 15) * CELL_WIDTH,
      CELL_WIDTH
    );

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
    // Vérifier si le créneau est passé
    const currentTime = new Date();
    const slotTime = setMinutes(setHours(selectedDate, hour), minutes);
    const isPastTime = isToday(selectedDate) && isBefore(slotTime, currentTime);

    // Ne pas permettre la sélection si le créneau est passé
    if (isPastTime) return;

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

  const getCellBackground = (hour: number, minute: number, aircraftId: string) => {
    const currentTime = setMinutes(setHours(selectedDate, hour), minute);
    
    // Vérifier les réservations
    const hasReservation = filteredReservations.some(reservation => {
      const start = new Date(reservation.startTime);
      const end = new Date(reservation.endTime);
      return currentTime >= start && currentTime < end && reservation.aircraftId === aircraftId;
    });

    if (hasReservation) {
      return "bg-red-100 hover:bg-red-200";
    }

    // Vérifier les disponibilités des instructeurs
    if (filters.instructors && filters.instructors.length > 0) {
      const hasInstructorAvailable = instructorAvailabilities.some(availability => {
        const start = parseISO(availability.start_time);
        const end = parseISO(availability.end_time);
        return currentTime >= start && 
               currentTime < end && 
               filters.instructors.includes(availability.user_id) &&
               availability.slot_type === 'available';
      });

      const hasInstructorUnavailable = instructorAvailabilities.some(availability => {
        const start = parseISO(availability.start_time);
        const end = parseISO(availability.end_time);
        return currentTime >= start && 
               currentTime < end && 
               filters.instructors.includes(availability.user_id) &&
               availability.slot_type === 'unavailable';
      });

      if (hasInstructorAvailable) {
        return "bg-green-50 hover:bg-green-100";
      }
      if (hasInstructorUnavailable) {
        return "bg-red-50 hover:bg-red-100";
      }
    }

    // Couleur par défaut
    return "hover:bg-slate-50";
  };

  const timeSlotStyle = (hour: number, minutes: number, aircraftId: string) => {
    const currentTime = new Date();
    const slotTime = setMinutes(setHours(selectedDate, hour), minutes);
    const isPastTime = isToday(selectedDate) && isBefore(slotTime, currentTime);

    return cn(
      "h-12 border-l border-gray-200 flex-shrink-0",
      {
        "border-l-2 border-l-gray-300": shouldShowBorder(hour, minutes),
        "bg-gray-50": isNightTime(hour, minutes),
        "bg-blue-100": isSlotSelected(hour, minutes, aircraftId),
        "bg-gray-200": isPastTime // Ajouter le grisage pour les créneaux passés
      },
      getCellBackground(hour, minutes, aircraftId),
      "w-6" // Ajouter une largeur fixe
    );
  };

  const hourHeaderStyle = (hour: number, minutes: number) => {
    return cn(
      "flex-shrink-0 h-8 border-l border-gray-200 text-xs text-gray-500 flex items-center justify-center",
      shouldShowBorder(hour, minutes) && "border-l-2 border-l-gray-300",
      "w-6" // Ajouter une largeur fixe
    );
  };

  const isInstructorAvailable = (instructorId: string, hour: number, minute: number) => {
    const slotTime = setMinutes(setHours(selectedDate, hour), minute);
    const availability = instructorAvailabilities.find(a => {
      const start = parseISO(a.start_time);
      const end = parseISO(a.end_time);
      return slotTime >= start && slotTime < end && a.user_id === instructorId;
    });

    if (!availability) return { available: true };

    return { available: availability.slot_type === 'available' };
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
              {filteredAircraft.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col justify-center h-12 px-2 border-b border-gray-200 bg-white"
                  style={{ minWidth: "120px", width: "120px" }}
                >
                  <span className="font-medium truncate">{a.registration}</span>
                  <span className="text-xs text-slate-500 truncate">{a.name}</span>
                </div>
              ))}
              {/* Lignes des instructeurs */}
              {filteredInstructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex flex-col justify-center h-12 px-2 border-b border-gray-200 bg-white"
                  style={{ minWidth: "120px", width: "120px" }}
                >
                  <span className="font-medium truncate">
                    {instructor.first_name} {instructor.last_name}
                  </span>
                  <span className="text-xs text-slate-500 truncate">Instructeur</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grille scrollable */}
          <div className="flex-1 overflow-x-auto">
            <div style={{ minWidth: `${timeSlots.length * CELL_WIDTH}px` }}>
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

              {/* Grille des réservations */}
              <div className="relative">
                {filteredAircraft.map((aircraft, aircraftIndex) => (
                  <div
                    key={aircraft.id}
                    className="relative h-12 border-b border-gray-200"
                    style={{ minWidth: `${timeSlots.length * CELL_WIDTH}px` }}
                    data-aircraft-id={aircraft.id}
                  >
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, ${CELL_WIDTH}px)` }}>
                      {timeSlots.map(({ hour, minutes }, index) => (
                        <div
                          key={index}
                          className={timeSlotStyle(hour, minutes, aircraft.id)}
                          onMouseDown={() => handleMouseDown(hour, minutes, aircraft.id)}
                          onMouseEnter={() => handleMouseMove(hour, minutes)}
                          onMouseUp={handleMouseUp}
                        />
                      ))}
                    </div>
                    {/* Périodes indisponibles */}
                    <div className="absolute inset-0 pointer-events-none">
                      {availabilities
                        .filter((availability) => availability.aircraft_id === aircraft.id)
                        .map((availability, index) => {
                          const style = calculateReservationStyle({
                            startTime: availability.start_time,
                            endTime: availability.end_time,
                            aircraftId: aircraft.id
                          } as Reservation);

                          if (!style) return null;

                          return (
                            <div
                              key={`availability-${index}`}
                              className="absolute h-10 rounded px-2 text-xs font-medium bg-red-100 text-red-900 border border-red-200"
                              style={style}
                            >
                              <div className="p-1">
                                <div className="mt-1 line-clamp-1 text-[0.65rem] leading-tight">
                                  Indisponible
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {/* Réservations pour cet avion */}
                    <div className="absolute inset-0 pointer-events-none">
                      {filteredReservations
                        .filter((r) => r.aircraftId === aircraft.id)
                        .map((reservation) => {
                          const pilot = users.find((u) => u.id === reservation.pilotId);
                          const instructor = reservation.instructorId
                            ? users.find((u) => u.id === reservation.instructorId)
                            : undefined;

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
                                <div className="mt-1 line-clamp-1 text-[0.65rem] leading-tight">
                                  {pilot ? `${pilot.first_name} ${pilot.last_name}` : "Pilote"}
                                  {instructor && (
                                    <>
                                      {" + "}
                                      {`${instructor.first_name} ${instructor.last_name}` || "Instructeur"}
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
                {/* Grille des instructeurs */}
                {filteredInstructors.map((instructor) => (
                  <div
                    key={`instructor-${instructor.id}`}
                    className="relative h-12 border-b border-gray-200"
                    style={{ minWidth: `${timeSlots.length * CELL_WIDTH}px` }}
                  >
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${timeSlots.length}, ${CELL_WIDTH}px)` }}>
                      {timeSlots.map(({ hour, minutes }, index) => {
                        const { available } = isInstructorAvailable(instructor.id, hour, minutes);
                        return (
                          <div
                            key={index}
                            className={cn(
                              "h-12 border-l border-gray-200 flex-shrink-0",
                              {
                                "border-l-2 border-l-gray-300": shouldShowBorder(hour, minutes),
                                "bg-gray-50": isNightTime(hour, minutes),
                                "bg-red-100": !available,
                                "bg-gray-200": isToday(selectedDate) && isBefore(setMinutes(setHours(selectedDate, hour), minutes), new Date())
                              },
                              "w-6"
                            )}
                          />
                        );
                      })}
                    </div>
                    {/* Réservations de l'instructeur */}
                    <div className="absolute inset-0 pointer-events-none">
                      {filteredReservations
                        .filter((r) => r.instructorId === instructor.id)
                        .map((reservation) => {
                          const pilot = users.find((u) => u.id === reservation.pilotId);
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
                                "bg-amber-100 text-amber-900 border-amber-200",
                                "hover:shadow-md hover:scale-[1.02]"
                              )}
                              style={style}
                            >
                              <div className="p-1">
                                <div className="mt-1 line-clamp-1 text-[0.65rem] leading-tight">
                                  {pilot ? `${pilot.first_name} ${pilot.last_name}` : "Pilote"}
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
          nightFlightsEnabled={clubSettings?.night_flights_enabled ?? false}
          availabilities={availabilities}
          onCreateFlight={handleCreateFlight}
          onUpdate={handleReservationUpdate}
        />
      )}
    </div>
  );
};

export default HorizontalReservationCalendar;
