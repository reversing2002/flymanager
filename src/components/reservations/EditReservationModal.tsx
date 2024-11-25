import React, { useState, useEffect, useMemo } from "react";
import { format, setMinutes, getMinutes } from "date-fns";
import { X, AlertTriangle } from "lucide-react";
import type {
  Aircraft,
  User,
  Reservation,
  FlightType,
} from "../../types/database";
import {
  getAircraft,
  getUsers,
  updateReservation,
  deleteReservation,
  getFlightTypes,
} from "../../lib/queries";
import { useAuth } from "../../contexts/AuthContext";

interface EditReservationModalProps {
  reservation: Reservation;
  onClose: () => void;
  onUpdate: () => void;
  reservations: Reservation[];
}

const EditReservationModal: React.FC<EditReservationModalProps> = ({
  reservation,
  onClose,
  onUpdate,
  reservations,
}) => {
  const { user: currentUser } = useAuth();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pilots, setPilots] = useState<User[]>([]);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);

  const roundToQuarterHour = (date: Date): Date => {
    const minutes = getMinutes(date);
    const roundedMinutes = Math.round(minutes / 15) * 15;
    return setMinutes(date, roundedMinutes);
  };

  const formatDateForInput = (date: Date): string => {
    const roundedDate = roundToQuarterHour(date);
    return format(roundedDate, "yyyy-MM-dd'T'HH:mm");
  };

  const [formData, setFormData] = useState({
    userId: reservation.userId,
    pilotId: reservation.pilotId,
    aircraftId: reservation.aircraftId,
    startTime: formatDateForInput(new Date(reservation.startTime)),
    endTime: formatDateForInput(new Date(reservation.endTime)),
    withInstructor: Boolean(reservation.instructorId),
    instructorId: reservation.instructorId || "",
    comments: reservation.comments || "",
    flightTypeId: reservation.flightTypeId || "",
  });

  const handleDateChange = (field: "startTime" | "endTime", value: string) => {
    const date = new Date(value);
    const roundedDate = roundToQuarterHour(date);
    setFormData({
      ...formData,
      [field]: formatDateForInput(roundedDate),
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [aircraftData, usersData, flightTypesData] = await Promise.all([
          getAircraft(),
          getUsers(),
          getFlightTypes(),
        ]);
        setAircraft(aircraftData);
        setFlightTypes(flightTypesData);

        // Filtrer les instructeurs et pilotes
        const instructorsList = usersData.filter(
          (u) => u.role === "INSTRUCTOR"
        );
        const pilotsList = usersData.filter((u) => u.role === "PILOT");
        setInstructors(instructorsList);
        setPilots(pilotsList);
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Erreur lors du chargement des données");
      }
    };
    loadData();
  }, []);

  // Vérifier les différents rôles et permissions
  const isAdmin = currentUser?.role === "ADMIN";
  const isInstructor = currentUser?.role === "INSTRUCTOR";

  // Un instructeur peut modifier si :
  // - c'est sa réservation
  // - ou s'il est l'instructeur de cette réservation
  // - ou si c'est une réservation de son élève (avec lui comme instructeur)
  const canModify =
    isAdmin || // Admin peut tout modifier
    currentUser?.id === reservation.userId || // Propriétaire de la réservation
    (isInstructor &&
      (currentUser?.id === reservation.instructorId || // Instructeur de la réservation
        currentUser?.id === reservation.pilotId)); // Instructeur est le pilote

  // Filtrer les pilotes disponibles selon le rôle
  const availablePilots = useMemo(() => {
    if (isAdmin) {
      return [...pilots, ...instructors]; // Admin voit tous les utilisateurs
    }
    if (isInstructor) {
      return pilots.filter(
        (pilot) =>
          pilot.id === currentUser?.id || // Lui-même
          formData.instructorId === currentUser?.id // Ses élèves
      );
    }
    // Pilote normal ne voit que lui-même
    return pilots.filter((pilot) => pilot.id === currentUser?.id);
  }, [
    isAdmin,
    isInstructor,
    pilots,
    instructors,
    currentUser?.id,
    formData.instructorId,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;

    setLoading(true);
    setError(null);

    try {
      const startTime = new Date(formData.startTime);
      const endTime = new Date(formData.endTime);

      // Debug des données avant validation
      console.log("Données du formulaire:", formData);
      console.log("Réservation originale:", reservation);

      if (!formData.flightTypeId) {
        setError("Le type de vol est requis");
        setLoading(false);
        return;
      }

      if (!formData.pilotId) {
        setError("Le pilote est requis");
        setLoading(false);
        return;
      }

      const updateData = {
        ...formData,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        flightTypeId: formData.flightTypeId,
      };

      console.log("Données envoyées à updateReservation:", {
        reservationId: reservation.id,
        updateData,
      });

      await updateReservation(reservation.id, updateData);

      onUpdate();
      onClose();
    } catch (err) {
      console.error("Erreur détaillée lors de la modification:", {
        error: err,
        formData,
        reservationId: reservation.id,
      });
      setError("Erreur lors de la modification de la réservation");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !canModify ||
      !window.confirm("Êtes-vous sûr de vouloir supprimer cette réservation ?")
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteReservation(reservation.id);
      onUpdate();
      onClose();
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      setError("Erreur lors de la suppression de la réservation");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Modifier la réservation</h2>
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

          {!canModify && (
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>Vous n'avez pas les droits pour modifier cette réservation</p>
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
                disabled={!canModify}
              >
                {aircraft.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.registration} - {a.name}
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
                    handleDateChange("startTime", e.target.value)
                  }
                  step="900"
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required
                  disabled={!canModify}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Fin
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => handleDateChange("endTime", e.target.value)}
                  step="900"
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  required
                  disabled={!canModify}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Instructeur
              </label>
              <select
                value={formData.instructorId}
                onChange={(e) => {
                  const newInstructorId = e.target.value;
                  setFormData({
                    ...formData,
                    instructorId: newInstructorId,
                    withInstructor: newInstructorId !== "",
                  });
                }}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                disabled={!canModify}
              >
                <option value="">Sans instructeur</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.firstName} {instructor.lastName}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Réservé par
                </label>
                <select
                  value={formData.userId}
                  className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed"
                  disabled
                >
                  <option value="">Sélectionner l'utilisateur</option>
                  {pilots.map((pilot) => (
                    <option key={pilot.id} value={pilot.id}>
                      {pilot.firstName} {pilot.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pilote
              </label>
              <select
                value={formData.pilotId}
                onChange={(e) =>
                  setFormData({ ...formData, pilotId: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
                disabled={!canModify}
              >
                <option value="">Sélectionner le pilote</option>
                {availablePilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.firstName} {pilot.lastName}
                    {pilot.id === currentUser?.id && " (moi-même)"}
                    {pilot.role === "INSTRUCTOR" && " (Instructeur)"}
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
                onChange={(e) =>
                  setFormData({ ...formData, flightTypeId: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
                disabled={!canModify}
              >
                <option value="">Sélectionner un type de vol</option>
                {flightTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

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
                disabled={!canModify}
              />
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              disabled={!canModify || deleting || loading}
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </button>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={loading || deleting}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={!canModify || loading || deleting}
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReservationModal;
