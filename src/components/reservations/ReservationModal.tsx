import React, { useState, useEffect, useMemo } from "react";
import { setMinutes, getMinutes } from "date-fns";
import { X, AlertTriangle } from "lucide-react";
import type { Aircraft, User, Reservation } from "../../types/database";
import { createReservation, updateReservation } from "../../lib/queries/reservations";
import { validateReservation } from "../../lib/reservationValidation";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";

interface ReservationModalProps {
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onSuccess: () => void;
  aircraft: Aircraft[];
  users: User[];
  preselectedAircraftId?: string;
  existingReservation?: Reservation;
}

const ReservationModal: React.FC<ReservationModalProps> = ({
  startTime,
  endTime,
  onClose,
  onSuccess,
  aircraft: propAircraft,
  users: propUsers,
  preselectedAircraftId,
  existingReservation,
}) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightTypes, setFlightTypes] = useState<any[]>([]);
  const [users, setUsers] = useState(propUsers || []);
  const [aircraft, setAircraft] = useState<Aircraft[]>(propAircraft || []);

  const isAdmin = currentUser?.role === "ADMIN";
  const isInstructor = currentUser?.role === "INSTRUCTOR";

  const roundToQuarterHour = (date: Date): Date => {
    const minutes = getMinutes(date);
    const roundedMinutes = Math.round(minutes / 15) * 15;
    return setMinutes(date, roundedMinutes);
  };

  const formatDateForInput = (date: Date): string => {
    const roundedDate = roundToQuarterHour(date);
    // Format la date en YYYY-MM-DDTHH:mm sans conversion UTC
    return roundedDate.getFullYear() +
      '-' + String(roundedDate.getMonth() + 1).padStart(2, '0') +
      '-' + String(roundedDate.getDate()).padStart(2, '0') +
      'T' + String(roundedDate.getHours()).padStart(2, '0') +
      ':' + String(roundedDate.getMinutes()).padStart(2, '0');
  };

  const [formData, setFormData] = useState({
    userId: existingReservation?.userId || currentUser?.id || "",
    pilotId: existingReservation?.pilotId || currentUser?.id || "",
    aircraftId: preselectedAircraftId || existingReservation?.aircraftId || propAircraft?.[0]?.id || "",
    startTime: formatDateForInput(startTime),
    endTime: formatDateForInput(endTime),
    instructorId: existingReservation?.instructorId || "",
    comments: existingReservation?.comments || "",
    flightTypeId: existingReservation?.flightTypeId || "",
    withInstructor: existingReservation?.instructorId ? true : false,
  });

  const canModifyReservation = () => {
    if (!currentUser) return false;
    if (currentUser.role === "ADMIN") return true;
    
    // Si c'est une nouvelle réservation
    if (!existingReservation) return true;
    
    // Accès total si on est impliqué dans la réservation
    return existingReservation.userId === currentUser.id || 
           existingReservation.pilotId === currentUser.id ||
           existingReservation.instructorId === currentUser.id;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load flight types
        const { data: flightTypesData, error: flightTypesError } = await supabase
          .from("flight_types")
          .select("*")
          .order("name");

        if (flightTypesError) throw flightTypesError;
        if (flightTypesData) {
          setFlightTypes(flightTypesData);
          
          // Only set default flight type for new reservations
          if (!existingReservation) {
            const defaultType = flightTypesData.find(t => !t.requires_instructor);
            if (defaultType) {
              setFormData(prev => ({
                ...prev,
                flightTypeId: defaultType.id,
                withInstructor: defaultType.requires_instructor,
              }));
            }
          }
        }

        // Load users if not provided
        if (!propUsers) {
          const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("*")
            .order("last_name");

          if (usersError) throw usersError;
          if (usersData) {
            setUsers(usersData);
          }
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
  }, [propAircraft, propUsers, existingReservation]);

  // Update form data when existingReservation changes
  useEffect(() => {
    if (existingReservation) {
      setFormData({
        userId: existingReservation.userId || currentUser?.id || "",
        pilotId: existingReservation.pilotId || currentUser?.id || "",
        aircraftId: existingReservation.aircraftId || preselectedAircraftId || propAircraft?.[0]?.id || "",
        startTime: formatDateForInput(new Date(existingReservation.startTime)),
        endTime: formatDateForInput(new Date(existingReservation.endTime)),
        instructorId: existingReservation.instructorId || "",
        comments: existingReservation.comments || "",
        flightTypeId: existingReservation.flightTypeId || "",
        withInstructor: Boolean(existingReservation.instructorId),
      });
    }
  }, [existingReservation, currentUser?.id, preselectedAircraftId, propAircraft]);

  // Get all pilots and instructors
  const allPilots = useMemo(() => {
    return users.filter(u => u.role === "PILOT" || u.role === "INSTRUCTOR");
  }, [users]);

  // Filter pilots based on permissions
  const availablePilots = useMemo(() => {
    if (isAdmin) {
      return allPilots; // Admin sees all pilots
    }
    if (isInstructor) {
      return allPilots.filter(
        pilot =>
          pilot.id === currentUser?.id || // Themselves
          formData.instructorId === currentUser?.id // Their students
      );
    }
    // Regular pilot only sees themselves
    return allPilots.filter(pilot => pilot.id === currentUser?.id);
  }, [isAdmin, isInstructor, allPilots, currentUser?.id, formData.instructorId]);

  const instructors = useMemo(() => {
    return users.filter(u => u.role === "INSTRUCTOR");
  }, [users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModifyReservation()) {
      toast.error("Vous n'avez pas les droits pour modifier cette réservation");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const startTime = new Date(formData.startTime);
      const endTime = new Date(formData.endTime);

      const validationError = validateReservation(
        startTime,
        endTime,
        formData.aircraftId,
        existingReservation ? [existingReservation.id] : []
      );

      if (validationError) {
        setError(validationError.message);
        return;
      }

      if (existingReservation) {
        // Mettre à jour la réservation existante
        await updateReservation(existingReservation.id, {
          ...formData,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
        toast.success("Réservation mise à jour");
      } else {
        // Créer une nouvelle réservation
        await createReservation({
          ...formData,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });
        toast.success("Réservation créée");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving reservation:", err);
      setError("Erreur lors de la sauvegarde de la réservation");
      toast.error("Erreur lors de la sauvegarde de la réservation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
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
            {existingReservation ? "Modifier la réservation" : "Nouvelle réservation"}
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

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !canModifyReservation()}
                className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${loading || !canModifyReservation()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                  }`}
              >
                {loading ? "En cours..." : existingReservation ? "Modifier" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;