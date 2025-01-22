import React, { useState, useEffect, useMemo } from "react";
import { setMinutes, getMinutes } from "date-fns";
import { X, AlertTriangle, Calendar, MessageSquare } from "lucide-react";
import type { Aircraft, User, Reservation, Availability } from "../../types/database";
import {
  createReservation,
  updateReservation,
  deleteReservation,
} from "../../lib/queries/reservations";
import { validateReservation } from "../../lib/reservationValidation";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { hasAnyGroup } from "../../lib/permissions";
import NewFlightForm from "../flights/NewFlightForm";
import LightAvailabilityCalendarModal from "../availability/LightAvailabilityCalendarModal";
import AircraftRemarksList from "../aircraft/AircraftRemarksList";
import { useNavigate, Link } from "react-router-dom";
import { getMemberBalance } from "../../lib/queries";
import SimpleCreditModal from "../accounts/SimpleCreditModal";

// Utility functions
const toUTC = (localDateStr: string): string => {
  const date = new Date(localDateStr);
  return date.toISOString();
};

const roundToQuarterHour = (date: Date): Date => {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 15) * 15;
  const newDate = new Date(date);
  newDate.setMinutes(roundedMinutes);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
};

const formatDateForInput = (date: Date): string => {
  // Utiliser toISOString().slice(0, 16) pour obtenir le format YYYY-MM-DDTHH:mm
  // et ajuster pour le fuseau horaire local
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 16);
};

const parseLocalDateTime = (dateStr: string): Date => {
  // Utiliser directement new Date() avec la chaîne ISO qui préserve le fuseau horaire
  return new Date(dateStr);
};

interface TimeControlProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}

const TimeControl: React.FC<TimeControlProps> = ({ value, onChange, label, disabled }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Fonction pour s'assurer qu'on a une date valide
  const getValidDate = (dateStr: string): Date => {
    return parseLocalDateTime(dateStr);
  };

  const timeString = useMemo(() => {
    const date = getValidDate(value);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit',
    });
  }, [value]);

  const dateString = useMemo(() => {
    const date = getValidDate(value);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }, [value]);

  const adjustTime = (minutes: number) => {
    const date = getValidDate(value);
    date.setMinutes(date.getMinutes() + minutes);
    const roundedDate = roundToQuarterHour(date);
    onChange(formatDateForInput(roundedDate));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentDate = getValidDate(value);
    const [year, month, day] = e.target.value.split('-').map(Number);
    
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    newDate.setMonth(month - 1);
    newDate.setDate(day);
    
    onChange(formatDateForInput(newDate));
  };

  // Générer les options d'heures par palier de 15 minutes
  const timeOptions = useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeStr);
      }
    }
    return options;
  }, []);

  const handleTimeSelect = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = getValidDate(value);
    date.setHours(hours);
    date.setMinutes(minutes);
    onChange(formatDateForInput(date));
    setShowTimePicker(false);
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          <div className="flex-1 flex space-x-2">
            <button
              type="button"
              onClick={() => !disabled && setShowDatePicker(!showDatePicker)}
              className={`flex-1 rounded-md border px-3 py-2 text-left text-sm ${
                disabled
                  ? "border-gray-200 bg-gray-50 text-gray-500"
                  : "border-gray-300 hover:border-blue-500"
              }`}
            >
              <span className="text-gray-500">{dateString}</span>
            </button>
            <select
              value={`${getValidDate(value).getHours().toString().padStart(2, '0')}:${getValidDate(value).getMinutes().toString().padStart(2, '0')}`}
              onChange={(e) => handleTimeSelect(e.target.value)}
              disabled={disabled}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {timeOptions.map((timeStr) => (
                <option key={timeStr} value={timeStr}>
                  {timeStr}
                </option>
              ))}
            </select>
          </div>
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => !disabled && adjustTime(-15)}
              disabled={disabled}
              className={`rounded-md p-2 text-sm ${
                disabled
                  ? "bg-gray-100 text-gray-400"
                  : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
              }`}
            >
              -15m
            </button>
            <button
              type="button"
              onClick={() => !disabled && adjustTime(15)}
              disabled={disabled}
              className={`rounded-md p-2 text-sm ${
                disabled
                  ? "bg-gray-100 text-gray-400"
                  : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300"
              }`}
            >
              +15m
            </button>
          </div>
        </div>

        {showDatePicker && (
          <input
            type="date"
            value={value.split('T')[0]}
            onChange={handleDateChange}
            disabled={disabled}
            className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
              disabled ? "bg-gray-100" : ""
            }`}
          />
        )}
      </div>
    </div>
  );
};

interface ReservationModalProps {
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onSuccess: () => void;
  aircraft: Aircraft[];
  users: User[];
  availabilities: Availability[];
  preselectedAircraftId?: string;
  preselectedFlightTypeId?: string;
  existingReservation?: Reservation;
  onCreateFlight?: (reservation: Reservation) => void;
  comments?: string;
}

const ReservationModal: React.FC<ReservationModalProps> = ({
  startTime,
  endTime,
  onClose,
  onSuccess,
  aircraft: propAircraft,
  users: propUsers,
  availabilities,
  preselectedAircraftId,
  preselectedFlightTypeId,
  existingReservation,
  onCreateFlight,
  comments,
}) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flightTypes, setFlightTypes] = useState<any[]>([]);
  const [users, setUsers] = useState(propUsers || []);
  const [aircraft, setAircraft] = useState<Aircraft[]>(propAircraft || []);
  const [showNewFlightForm, setShowNewFlightForm] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedInstructor, setSelectedInstructor] = useState<User | null>(null);
  const [hasExistingFlight, setHasExistingFlight] = useState(false);
  const [existingReservations, setExistingReservations] = useState<
    Reservation[]
  >([]);

  const isAdmin = hasAnyGroup(currentUser, ["ADMIN"]);
  const isInstructor = hasAnyGroup(currentUser, ["INSTRUCTOR"]);

  const canModifyReservation = () => {
    if (!currentUser) return false;
    if (hasAnyGroup(currentUser, ["ADMIN"])) return true;

    // Si c'est une nouvelle réservation
    if (!existingReservation) return true;

    // Accès total si on est impliqué dans la réservation
    const isInvolved = (
      existingReservation.userId === currentUser.id ||
      existingReservation.pilotId === currentUser.id ||
      existingReservation.instructorId === currentUser.id
    );

    console.log("=== Permissions Debug ===");
    console.log("Current User:", {
      id: currentUser.id,
      roles: currentUser.roles || []
    });
    console.log("Reservation:", {
      userId: existingReservation.userId,
      pilotId: existingReservation.pilotId,
      instructorId: existingReservation.instructorId,
      fullReservation: existingReservation
    });
    console.log("Is Involved:", isInvolved);

    return isInvolved;
  };

  const canTransformToFlight = useMemo(() => {
    return canModifyReservation();
  }, [currentUser, existingReservation]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    
    // Vérifier la disponibilité immédiatement si l'avion change
    if (name === 'aircraftId') {
      checkAircraftAvailability(value);
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const checkAircraftAvailability = (aircraftId: string) => {
    const validationError = validateReservation(
      new Date(formData.startTime),
      new Date(formData.endTime),
      aircraftId,
      formData.pilotId,
      formData.instructorId || null,
      existingReservations || [],
      availabilities || [],
      existingReservation?.id
    );

    if (validationError) {
      setError(validationError.message);
      return false;
    }
    setError("");
    return true;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Charger les réservations existantes
        const { data: reservationsData, error: reservationsError } =
          await supabase
            .from("reservations")
            .select("*")
            .gte("end_time", new Date().toISOString());

        if (reservationsError) throw reservationsError;
        setExistingReservations(reservationsData || []);

        // Vérifier si un vol existe déjà pour cette réservation
        if (existingReservation) {
          const { data: flightData, error: flightError } = await supabase
            .from("flights")
            .select("id")
            .eq("reservation_id", existingReservation.id)
            .single();

          if (flightError && flightError.code !== "PGRST116") {
            console.error("Error checking for existing flight:", flightError);
          }
          setHasExistingFlight(!!flightData);
        }

        // Load flight types
        const { data: flightTypesData, error: flightTypesError } =
          await supabase.from("flight_types").select("*").order("name");

        if (flightTypesError) throw flightTypesError;
        if (flightTypesData) {
          setFlightTypes(flightTypesData);

          // Si un type est présélectionné, l'utiliser
          if (preselectedFlightTypeId) {
            setFormData((prev) => ({
              ...prev,
              flightTypeId: preselectedFlightTypeId,
              withInstructor:
                flightTypesData.find((t) => t.id === preselectedFlightTypeId)
                  ?.requires_instructor || false,
            }));
          }
          // Sinon, utiliser le type par défaut pour les nouvelles réservations
          else if (!existingReservation) {
            const defaultType = flightTypesData.find((t) => t.is_default);
            if (defaultType) {
              setFormData((prev) => ({
                ...prev,
                flightTypeId: defaultType.id,
                withInstructor: defaultType.requires_instructor,
              }));
            }
          }
        }

        // Charger les utilisateurs avec leurs rôles
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select(
            `
            *,
            user_group_memberships (
              group:user_groups(name)
            )
          `
          )
          .order("first_name, last_name");

        if (usersError) throw usersError;
        if (usersData) {
          // Transformer les données pour inclure les rôles
          const usersWithRoles = usersData.map((user) => ({
            ...user,
            roles:
              user.user_group_memberships?.map(
                (membership) => membership.group.name
              ) || [],
          }));
          setUsers(usersWithRoles);
        }

        // Load aircraft if not provided
        if (!propAircraft) {
          const { data: aircraftData, error: aircraftError } = await supabase
            .from("aircraft")
            .select("*")
            .eq("status", "AVAILABLE")
            .order("registration");

          if (aircraftError) throw aircraftError;
          if (aircraftData) {
            setAircraft(aircraftData);
          }
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Erreur lors du chargement des données");
        toast.error("Erreur lors du chargement des données");
      }
    };

    loadData();
  }, [propAircraft, existingReservation]);

  // Update form data when existingReservation changes
  useEffect(() => {
    if (existingReservation) {
      setFormData({
        userId: existingReservation.userId || currentUser?.id || "",
        pilotId: existingReservation.pilotId || currentUser?.id || "",
        aircraftId:
          existingReservation.aircraftId ||
          preselectedAircraftId ||
          propAircraft?.[0]?.id ||
          "",
        startTime: formatDateForInput(new Date(existingReservation.startTime)),
        endTime: formatDateForInput(new Date(existingReservation.endTime)),
        instructorId: existingReservation.instructorId || "",
        comments: existingReservation.comments || "",
        flightTypeId: existingReservation.flightTypeId || "",
        withInstructor: !!existingReservation.instructorId,
      });
    }
  }, [
    existingReservation,
    currentUser?.id,
    preselectedAircraftId,
    propAircraft,
  ]);

  // Get all pilots and instructors
  const allPilots = useMemo(() => {
    return users
      .filter((u) => {
        return u.roles?.some((role) => 
          ["PILOT", "INSTRUCTOR"].some(r => r.toLowerCase() === role.toLowerCase())
        );
      })
      .sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
        const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [users]);

  // Filter pilots based on permissions
  const availablePilots = useMemo(() => {
    if (!currentUser) return [];

    if (hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR"])) {
      return allPilots;
    }

    // Pour les autres cas, montrer uniquement l'utilisateur courant
    return allPilots.filter((pilot) => pilot.id === currentUser.id);
  }, [allPilots, currentUser]);

  const instructors = useMemo(() => {
    return users
      .filter((u) =>
        u.roles?.some((role) => ["INSTRUCTOR"].some(r => r.toLowerCase() === role.toLowerCase()))
      )
      .sort((a, b) => {
        const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
        const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [users]);

  const [formData, setFormData] = useState<{
    startTime: string;
    endTime: string;
    aircraftId: string;
    pilotId: string;
    userId: string;
    instructorId?: string;
    flightTypeId?: string;
    withInstructor: boolean;
  }>(() => {
    // Si c'est une nouvelle réservation
    if (!existingReservation) {
      let startDate: Date;
      let endDate: Date;

      // Si des heures sont passées en paramètres (via TimeGrid), les utiliser
      if (startTime && endTime) {
        startDate = new Date(startTime);
        endDate = new Date(endTime);
      } else {
        // Sinon, utiliser l'heure actuelle arrondie au quart d'heure suivant
        const now = new Date();
        const currentMinutes = now.getMinutes();
        const roundedMinutes = Math.ceil(currentMinutes / 15) * 15;
        startDate = new Date(now);
        startDate.setMinutes(roundedMinutes, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
      }

      // Utiliser le premier avion disponible si aucun n'est présélectionné
      const defaultAircraftId = preselectedAircraftId || propAircraft?.[0]?.id || aircraft?.[0]?.id || "";

      return {
        startTime: formatDateForInput(startDate),
        endTime: formatDateForInput(endDate),
        aircraftId: defaultAircraftId,
        pilotId: currentUser?.id || "",
        userId: currentUser?.id || "",
        instructorId: "",
        flightTypeId: preselectedFlightTypeId || "",
        withInstructor: false,
      };
    }

    // Si c'est une réservation existante, utiliser ses valeurs
    return {
      startTime: formatDateForInput(new Date(existingReservation.startTime)),
      endTime: formatDateForInput(new Date(existingReservation.endTime)),
      aircraftId: existingReservation.aircraftId,
      pilotId: existingReservation.pilotId,
      userId: existingReservation.userId,
      instructorId: existingReservation.instructorId || "",
      flightTypeId: existingReservation.flightTypeId || "",
      withInstructor: !!existingReservation.instructorId,
    };
  });

  const [balance, setBalance] = useState<{ validated: number; pending: number } | null>(null);

  // Mettre à jour le solde quand le pilote change
  useEffect(() => {
    if (formData.pilotId) {
      getMemberBalance(formData.pilotId).then((balanceData) => {
        setBalance(balanceData);
      });
    } else {
      setBalance(null);
    }
  }, [formData.pilotId]);

  const handlePilotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPilotId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      pilotId: newPilotId,
      instructorId: "", // Réinitialiser l'instructeur quand le pilote change
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyReservation()) {
      setError("Vous n'avez pas les permissions nécessaires pour modifier cette réservation");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Vérifier la disponibilité avant de soumettre
      if (!checkAircraftAvailability(formData.aircraftId)) {
        return;
      }

      const reservationData = {
        startTime: toUTC(formData.startTime),
        endTime: toUTC(formData.endTime),
        aircraftId: formData.aircraftId,
        pilotId: formData.pilotId,
        userId: currentUser?.id, // Utiliser l'ID de l'utilisateur connecté comme userId
        instructorId: formData.withInstructor ? formData.instructorId : null,
        flightTypeId: formData.flightTypeId,
      };

      if (existingReservation) {
        await updateReservation(existingReservation.id, reservationData);
        toast.success("Réservation mise à jour avec succès");
      } else {
        await createReservation(reservationData);
        toast.success("Réservation créée avec succès");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error submitting reservation:", err);
      setError("Une erreur est survenue lors de la soumission de la réservation");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReservation || !canModifyReservation()) return;

    try {
      setLoading(true);
      await deleteReservation(existingReservation.id);
      toast.success("Réservation supprimée");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error deleting reservation:", err);
      toast.error("Erreur lors de la suppression de la réservation");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlight = () => {
    if (existingReservation && onCreateFlight) {
      onCreateFlight(existingReservation);
      onClose();
    }
  };

  const handleNewFlightSuccess = () => {
    setShowNewFlightForm(false);
    onSuccess();
    onClose();
    navigate("/flights"); // Redirection vers la liste des vols
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)); // Durée en minutes
  };

  const validateTimeSlot = (time: string): boolean => {
    const date = new Date(time);
    const minutes = date.getMinutes();
    return minutes % 15 === 0;
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const date = new Date(value);
    const roundedDate = roundToQuarterHour(date);
    
    if (field === 'startTime') {
      const currentEndTime = new Date(formData.endTime);
      if (roundedDate >= currentEndTime) {
        // Ajouter 30 minutes à l'heure de début pour l'heure de fin
        const newEndTime = new Date(roundedDate.getTime() + 30 * 60000);
        const roundedEndTime = roundToQuarterHour(newEndTime);
        
        setFormData(prev => ({
          ...prev,
          startTime: formatDateForInput(roundedDate),
          endTime: formatDateForInput(roundedEndTime)
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: formatDateForInput(roundedDate)
    }));
  };

  const [showCreditModal, setShowCreditModal] = useState(false);

  if (showNewFlightForm && existingReservation) {
    const duration = calculateDuration(
      existingReservation.startTime,
      existingReservation.endTime
    );

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Transformer en vol</h2>
            <button
              onClick={() => setShowNewFlightForm(false)}
              className="p-1 hover:bg-slate-100 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <NewFlightForm
            aircraftList={aircraft}
            users={users}
            onSuccess={handleNewFlightSuccess}
            onCancel={() => setShowNewFlightForm(false)}
            initialData={{
              date: existingReservation.startTime.split("T")[0],
              userId: existingReservation.pilotId || existingReservation.userId,
              instructorId: existingReservation.instructorId,
              aircraftId: existingReservation.aircraftId,
              flightTypeId: existingReservation.flightTypeId,
              reservationId: existingReservation.id,
              duration: duration,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {existingReservation ? "Modifier la réservation" : "Nouvelle réservation"}
                </h3>
                <button
                  onClick={onClose}
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <span className="sr-only">Fermer</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4 p-4">
                  {error && (
                    <div className="mb-4 flex items-center rounded-md bg-red-50 p-3 text-red-700">
                      <AlertTriangle className="mr-2 h-5 w-5" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-4">
                    <TimeControl
                      label="Début"
                      value={formData.startTime}
                      onChange={(value) => handleTimeChange('startTime', value)}
                      disabled={!canModifyReservation()}
                    />
                    
                    <TimeControl
                      label="Fin"
                      value={formData.endTime}
                      onChange={(value) => handleTimeChange('endTime', value)}
                      disabled={!canModifyReservation()}
                    />
                  </div>

                  {/* Sélection de l'avion */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Avion
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="aircraftId"
                        value={formData.aircraftId}
                        onChange={handleInputChange}
                        disabled={!canModifyReservation()}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                          ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                      >
                        {aircraft
                          .filter((a) => a.status === "AVAILABLE" || a.status === "MAINTENANCE")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.registration} - {a.name}
                              {a.status === "MAINTENANCE" ? " (En maintenance)" : ""}
                            </option>
                          ))}
                      </select>
                      {formData.aircraftId && (
                        <button
                          type="button"
                          onClick={() => setShowRemarksModal(true)}
                          className="mt-1 inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded-md"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Remarques</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Type de vol */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Type de vol
                    </label>
                    <select
                      name="flightTypeId"
                      value={formData.flightTypeId}
                      onChange={handleInputChange}
                      disabled={!canModifyReservation()}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                        ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                    >
                      <option value="">Sélectionnez un type de vol</option>
                      {flightTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pilote */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Pilote
                    </label>
                    <select
                      name="pilotId"
                      value={formData.pilotId}
                      onChange={handlePilotChange}
                      disabled={!canModifyReservation()}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                        ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                      required
                    >
                      <option value="">Sélectionner un pilote</option>
                      {availablePilots.map((pilot) => (
                        <option key={pilot.id} value={pilot.id}>
                          {pilot.last_name} {pilot.first_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Instructeur */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Instructeur
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="instructorId"
                        value={formData.instructorId}
                        onChange={(e) => {
                          handleInputChange(e);
                          const instructor = instructors.find(i => i.id === e.target.value);
                          setSelectedInstructor(instructor || null);
                        }}
                        disabled={!canModifyReservation()}
                        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                          ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                      >
                        <option value="">Aucun</option>
                        {instructors.map((instructor) => (
                          <option key={instructor.id} value={instructor.id}>
                            {instructor.last_name} {instructor.first_name}
                          </option>
                        ))}
                      </select>
                      {formData.instructorId && (
                        <button
                          type="button"
                          onClick={() => setShowAvailabilityModal(true)}
                          className="mt-1 inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded-md"
                        >
                          <Calendar className="h-4 w-4" />
                          <span>Planning</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Commentaires */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Commentaires
                    </label>
                    <textarea
                      name="comments"
                      value={formData.comments}
                      onChange={handleInputChange}
                      disabled={!canModifyReservation()}
                      rows={2}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                        ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                    />
                  </div>

                  {/* Affichage du solde seulement si < 100€ et si un pilote est sélectionné */}
                  {balance !== null && balance.pending < 100 && formData.pilotId && (
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Solde du pilote</p>
                        <p className={`text-lg font-bold ${balance.pending < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {`${balance.pending.toFixed(2)} €`}
                        </p>
                      </div>
                      {balance.pending < 0 && (
                        <button 
                          onClick={() => setShowCreditModal(true)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          Créditer le compte
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col space-y-6">
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      type="submit"
                      disabled={loading || !canModifyReservation() || (balance !== null && balance.pending < 0)}
                      className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-lg 
                        ${loading || !canModifyReservation() || (balance !== null && balance.pending < 0)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      {existingReservation ? "Modifier" : "Créer"}
                    </button>
                    {existingReservation && canModifyReservation() && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className={`w-full sm:w-auto px-4 py-2 text-sm font-medium text-white rounded-lg 
                          ${loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700"}`}
                      >
                        {loading ? "En cours..." : "Supprimer"}
                      </button>
                    )}
                  </div>
                  
                  {existingReservation && onCreateFlight && canTransformToFlight && !hasExistingFlight && (
                    <div className="sm:flex sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowNewFlightForm(true)}
                        className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 shadow-sm"
                      >
                        Valider mon vol
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        {showAvailabilityModal && selectedInstructor && (
          <LightAvailabilityCalendarModal
            userId={selectedInstructor.id}
            userName={`${selectedInstructor.first_name} ${selectedInstructor.last_name}`}
            onClose={() => setShowAvailabilityModal(false)}
          />
        )}
        {showRemarksModal && (
          <AircraftRemarksList
            aircraftId={formData.aircraftId}
            onClose={() => setShowRemarksModal(false)}
          />
        )}
      </div>

      {/* Modal de crédit */}
      {showCreditModal && (
        <SimpleCreditModal
          onClose={() => setShowCreditModal(false)}
          userId={formData.pilotId}
        />
      )}
    </>
  );
};

export default ReservationModal;
