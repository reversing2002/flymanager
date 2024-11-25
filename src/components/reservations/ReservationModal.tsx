import React, { useState, useEffect, useMemo } from "react";
import { setMinutes, getMinutes } from "date-fns";
import { X, AlertTriangle } from "lucide-react";
import type { Aircraft, User, Reservation } from "../../types/database";
import { createReservation } from "../../lib/queries/reservations";
import { validateReservation } from "../../lib/reservationValidation";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";

interface ReservationModalProps {
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onSuccess: () => void;
  aircraft?: Aircraft[];
  users?: User[];
  preselectedAircraftId?: string;
}

const ReservationModal: React.FC<ReservationModalProps> = ({
  startTime,
  endTime,
  onClose,
  onSuccess,
  aircraft: propAircraft,
  users: propUsers,
  preselectedAircraftId,
}) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";
  const isInstructor = currentUser?.role === "INSTRUCTOR";
  const [aircraft, setAircraft] = useState<Aircraft[]>(propAircraft || []);
  const [instructors, setInstructors] = useState<User[]>(
    propUsers?.filter((u) => u.role === "INSTRUCTOR") || []
  );
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flightTypes, setFlightTypes] = useState<any[]>([]);
  const [selectedFlightType, setSelectedFlightType] = useState("");
  const [pilots, setPilots] = useState<User[]>([]);

  const roundToQuarterHour = (date: Date): Date => {
    const minutes = getMinutes(date);
    const roundedMinutes = Math.round(minutes / 15) * 15;
    return setMinutes(date, roundedMinutes);
  };

  const formatDateForInput = (date: Date): string => {
    const roundedDate = roundToQuarterHour(date);
    const tzOffset = roundedDate.getTimezoneOffset() * 60000;
    const localDate = new Date(roundedDate.getTime() - tzOffset);
    return localDate.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    userId: currentUser?.id || "",
    pilotId: currentUser?.id || "",
    aircraftId: preselectedAircraftId || propAircraft?.[0]?.id || "",
    startTime: formatDateForInput(startTime),
    endTime: formatDateForInput(endTime),
    instructorId: "",
    comments: "",
    flightTypeId: "",
    withInstructor: false,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load flight types
        const { data: flightTypesData, error: flightTypesError } = await supabase
          .from('flight_types')
          .select('*')
          .order('name');

        if (flightTypesError) throw flightTypesError;
        if (flightTypesData) {
          setFlightTypes(flightTypesData);
          // Set default flight type
          const defaultType = flightTypesData.find(t => !t.requires_instructor);
          if (defaultType) {
            setSelectedFlightType(defaultType.id);
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
            .from('users')
            .select('*')
            .order('last_name');

          if (usersError) throw usersError;
          if (usersData) {
            const pilotsList = usersData.filter(u => u.role === "PILOT");
            const instructorsList = usersData.filter(u => u.role === "INSTRUCTOR");
            setPilots(pilotsList);
            setInstructors(instructorsList);
          }
        }

        // Load aircraft if not provided
        if (!propAircraft) {
          const { data: aircraftData, error: aircraftError } = await supabase
            .from('aircraft')
            .select('*')
            .eq('status', 'AVAILABLE')
            .order('registration');

          if (aircraftError) throw aircraftError;
          if (aircraftData) {
            setAircraft(aircraftData);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erreur lors du chargement des données');
        toast.error('Erreur lors du chargement des données');
      }
    };

    loadData();
  }, [propAircraft, propUsers]);

  const availablePilots = useMemo(() => {
    if (isAdmin) {
      return [...pilots, ...instructors];
    }
    if (isInstructor) {
      return pilots.filter(
        (pilot) =>
          pilot.id === currentUser?.id || formData.instructorId === currentUser?.id
      );
    }
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
    setLoading(true);
    setError(null);

    try {
      const validationError = validateReservation(
        new Date(formData.startTime),
        new Date(formData.endTime),
        formData.aircraftId,
        reservations
      );

      if (validationError) {
        setError(validationError.message);
        return;
      }

      await createReservation({
        ...formData,
        flightTypeId: selectedFlightType,
      });

      toast.success('Réservation créée');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Erreur lors de la création de la réservation');
      toast.error('Erreur lors de la création de la réservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Nouvelle Réservation</h2>
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
                value={selectedFlightType}
                onChange={(e) => {
                  const type = flightTypes.find(t => t.id === e.target.value);
                  setSelectedFlightType(e.target.value);
                  setFormData(prev => ({
                    ...prev,
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
              {loading ? "Création..." : "Confirmer la réservation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReservationModal;