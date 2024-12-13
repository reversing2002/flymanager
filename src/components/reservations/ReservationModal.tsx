import React, { useState, useEffect, useMemo } from "react";
import { setMinutes, getMinutes } from "date-fns";
import { X, AlertTriangle, Calendar } from "lucide-react";
import type { Aircraft, User, Reservation } from "../../types/database";
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
import { useNavigate } from "react-router-dom";

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
            <button
              type="button"
              onClick={() => !disabled && setShowTimePicker(!showTimePicker)}
              className={`rounded-md border px-3 py-2 text-sm ${
                disabled
                  ? "border-gray-200 bg-gray-50 text-gray-500"
                  : "border-gray-300 hover:border-blue-500"
              }`}
            >
              <span className="font-medium">{timeString}</span>
            </button>
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

        {showTimePicker && (
          <div className="absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
            {timeOptions.map((timeStr) => (
              <button
                key={timeStr}
                type="button"
                onClick={() => handleTimeSelect(timeStr)}
                className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                {timeStr}
              </button>
            ))}
          </div>
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
    return (
      existingReservation.userId === currentUser.id ||
      existingReservation.pilotId === currentUser.id ||
      existingReservation.instructorId === currentUser.id
    );
  };

  const canTransformToFlight = useMemo(() => {
    if (!currentUser || !existingReservation) return false;

    const userRoles = currentUser.roles || [];
    const isAdmin = userRoles.includes("ADMIN");
    const isOwner = currentUser.id === existingReservation.userId;
    const isInstructor = currentUser.id === existingReservation.instructorId;

    return isAdmin || isOwner || isInstructor;
  }, [currentUser, existingReservation]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          .order("last_name");

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
        withInstructor: Boolean(existingReservation.instructorId),
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
    return users.filter((u) => {
      return u.roles?.some((role) => ["PILOT", "INSTRUCTOR"].includes(role));
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
    return users.filter((u) =>
      u.roles?.some((role) => ["INSTRUCTOR"].includes(role))
    );
  }, [users]);

  const [formData, setFormData] = useState({
    userId: existingReservation?.userId || currentUser?.id || "",
    pilotId: existingReservation?.pilotId || currentUser?.id || "",
    aircraftId:
      preselectedAircraftId ||
      existingReservation?.aircraftId ||
      propAircraft?.[0]?.id ||
      "",
    startTime: formatDateForInput(startTime),
    endTime: formatDateForInput(endTime),
    instructorId: existingReservation?.instructorId || "",
    comments: comments || existingReservation?.comments || "",
    flightTypeId:
      preselectedFlightTypeId || existingReservation?.flightTypeId || "",
    withInstructor: existingReservation?.instructorId ? true : false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const validationError = validateReservation(
        new Date(formData.startTime),
        new Date(formData.endTime),
        formData.aircraftId,
        formData.pilotId,
        formData.instructorId || null,
        existingReservations || [],
        existingReservation?.id
      );

      if (validationError) {
        setError(validationError.message);
        return;
      }

      // Convert local times to UTC before sending to the database
      const reservationData = {
        ...formData,
        startTime: toUTC(formData.startTime),
        endTime: toUTC(formData.endTime),
        instructorId: formData.instructorId || null,
      };

      // Create or update the reservation
      if (existingReservation) {
        await updateReservation(existingReservation.id, reservationData);
      } else {
        await createReservation(reservationData);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      setError(
        error.message || "Une erreur est survenue lors de la sauvegarde"
      );
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
              pilotId:
                existingReservation.pilotId || existingReservation.userId,
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div
          className="fixed inset-0 bg-black bg-opacity-25"
          onClick={onClose}
        />

        <div className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all relative">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
            {existingReservation
              ? "Modifier la réservation"
              : "Nouvelle réservation"}
          </h3>

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
                <select
                  name="aircraftId"
                  value={formData.aircraftId}
                  onChange={handleInputChange}
                  disabled={!canModifyReservation()}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                    ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                >
                  {aircraft
                    .filter((a) => a.status === "AVAILABLE")
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.registration} - {a.name}
                      </option>
                    ))}
                </select>
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
                  onChange={handleInputChange}
                  disabled={!canModifyReservation()}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                    ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                  required
                >
                  <option value="">Sélectionner un pilote</option>
                  {availablePilots.map((pilot) => (
                    <option key={pilot.id} value={pilot.id}>
                      {pilot.first_name} {pilot.last_name}
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
                        {instructor.first_name} {instructor.last_name}
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
            </div>

            <div className="mt-6 flex justify-between space-x-3">
              <div className="flex space-x-3">
                {existingReservation && canModifyReservation() && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${
                        loading
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                      }`}
                  >
                    {loading ? "En cours..." : "Supprimer"}
                  </button>
                )}
                {existingReservation &&
                  onCreateFlight &&
                  canTransformToFlight &&
                  !hasExistingFlight && (
                    <button
                      type="button"
                      onClick={() => setShowNewFlightForm(true)}
                      className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    >
                      Transformer en vol
                    </button>
                  )}
              </div>
              <button
                type="submit"
                disabled={loading || !canModifyReservation()}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    loading || !canModifyReservation()
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                  }`}
              >
                {loading
                  ? "En cours..."
                  : existingReservation
                  ? "Modifier"
                  : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {showAvailabilityModal && selectedInstructor && (
        <LightAvailabilityCalendarModal
          userId={selectedInstructor.id}
          userName={`${selectedInstructor.first_name} ${selectedInstructor.last_name}`}
          onClose={() => setShowAvailabilityModal(false)}
        />
      )}
    </div>
  );
};

export default ReservationModal;
