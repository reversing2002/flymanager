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
          // Set default flight type
          const defaultType = flightTypesData.find(t => !t.requires_instructor);
          if (defaultType) {
            setFormData(prev => ({
              ...prev,
              flightTypeId: defaultType.id,
              withInstructor: defaultType.requires_instructor,
            }));
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
  }, [propAircraft, propUsers]);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{existingReservation ? "Modifier la réservation" : "Nouvelle Réservation"}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Appareil
              </label>
              <select
                value={formData.aircraftId}
                onChange={(e) =>
                  setFormData({ ...formData, aircraftId: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              >
                <option value="">Sélectionner un appareil</option>
                {aircraft
                  .filter((a) => a.status === "AVAILABLE")
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.registration} - {a.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type de vol
              </label>
              <select
                value={formData.flightTypeId}
                onChange={(e) => {
                  const type = flightTypes.find(t => t.id === e.target.value);
                  setFormData(prev => ({
                    ...prev,
                    flightTypeId: e.target.value,
                    withInstructor: type?.requires_instructor || false,
                    instructorId: type?.requires_instructor ? currentUser?.id : "",
                  }));
                }}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              >
                <option value="">Sélectionner un type</option>
                {flightTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Début
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required
                  step="900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fin
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required
                  step="900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pilote
              </label>
              <select
                value={formData.pilotId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pilotId: e.target.value,
                    userId: isAdmin ? formData.userId : e.target.value,
                  })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              >
                <option value="">Sélectionner un pilote</option>
                {availablePilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.firstName} {pilot.lastName}
                    {pilot.id === currentUser?.id && " (moi-même)"}
                    {pilot.role === "INSTRUCTOR" && " (Instructeur)"}
                  </option>
                ))}
              </select>
            </div>

            {formData.withInstructor && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Instructeur
                </label>
                <select
                  value={formData.instructorId}
                  onChange={(e) =>
                    setFormData({ ...formData, instructorId: e.target.value })
                  }
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required={formData.withInstructor}
                >
                  <option value="">Sélectionner un instructeur</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.firstName} {instructor.lastName}
                      {instructor.id === currentUser?.id && " (moi-même)"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Commentaires
              </label>
              <textarea
                value={formData.comments}
                onChange={(e) =>
                  setFormData({ ...formData, comments: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Sauvegarde..." : existingReservation ? "Mettre à jour la réservation" : "Confirmer la réservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationModal;