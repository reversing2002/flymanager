import React, { useState, useEffect, useMemo } from "react";
import { setMinutes, getMinutes } from "date-fns";
import { X, AlertTriangle } from "lucide-react";
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
import NewFlightForm from "../flights/NewFlightForm"; // Import the NewFlightForm component
import { useNavigate } from "react-router-dom";

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
  const [error, setError] = useState<string | null>(null);
  const [flightTypes, setFlightTypes] = useState<any[]>([]);
  const [users, setUsers] = useState(propUsers || []);
  const [aircraft, setAircraft] = useState<Aircraft[]>(propAircraft || []);
  const [showNewFlightForm, setShowNewFlightForm] = useState(false);
  const [hasExistingFlight, setHasExistingFlight] = useState(false);
  const [existingReservations, setExistingReservations] = useState<
    Reservation[]
  >([]);

  const isAdmin = hasAnyGroup(currentUser, ["ADMIN"]);
  const isInstructor = hasAnyGroup(currentUser, ["INSTRUCTOR"]);

  const roundToQuarterHour = (date: Date): Date => {
    const minutes = getMinutes(date);
    const roundedMinutes = Math.round(minutes / 15) * 15;
    return setMinutes(date, roundedMinutes);
  };

  const formatDateForInput = (date: Date): string => {
    const roundedDate = roundToQuarterHour(date);
    // Format la date en YYYY-MM-DDTHH:mm sans conversion UTC
    return (
      roundedDate.getFullYear() +
      "-" +
      String(roundedDate.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(roundedDate.getDate()).padStart(2, "0") +
      "T" +
      String(roundedDate.getHours()).padStart(2, "0") +
      ":" +
      String(roundedDate.getMinutes()).padStart(2, "0")
    );
  };

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

      // Créer ou mettre à jour la réservation
      if (existingReservation) {
        await updateReservation(existingReservation.id, {
          ...formData,
          instructorId: formData.instructorId || null,
        });
      } else {
        await createReservation({
          ...formData,
          instructorId: formData.instructorId || null,
        });
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
            <div className="space-y-4">
              {/* Champs de date/heure */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Début
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    disabled={!canModifyReservation()}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                      ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fin
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    disabled={!canModifyReservation()}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                      ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                  />
                </div>
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
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
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
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
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
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
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
                <select
                  name="instructorId"
                  value={formData.instructorId}
                  onChange={handleInputChange}
                  disabled={!canModifyReservation()}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                    ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                >
                  <option value="">Aucun</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.first_name} {instructor.last_name}
                    </option>
                  ))}
                </select>
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
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm
                    ${!canModifyReservation() ? "bg-gray-100" : ""}`}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 mt-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

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
    </div>
  );
};

export default ReservationModal;
