import React, { useState, useEffect, useMemo } from "react";
import { setMinutes, getMinutes } from "date-fns";
import { X, AlertTriangle } from "lucide-react";
import type { Aircraft, User, Reservation } from "../../types/database";
import {
  getAircraft,
  getUsers,
  getReservations,
  createReservation,
} from "../../lib/queries";
import { validateReservation } from "../../lib/reservationValidation";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

interface ReservationModalProps {
  startTime: Date;
  endTime: Date;
  onClose: () => void;
  onSuccess: () => void;
  aircraft?: Aircraft[];
  users?: User[];
  preselectedAircraftId?: string;
}

interface FlightType {
  id: string;
  name: string;
  requires_instructor: boolean;
  accounting_category: string;
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
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isInstructor = user?.role === "INSTRUCTOR";
  const [aircraft, setAircraft] = useState<Aircraft[]>(propAircraft || []);
  const [instructors, setInstructors] = useState<User[]>(
    propUsers?.filter((u) => u.role === "INSTRUCTOR") || []
  );
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [selectedFlightType, setSelectedFlightType] = useState("");
  const [pilots, setPilots] = useState<User[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

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
    userId: user?.id || "",
    pilotId: user?.id || "",
    aircraftId: preselectedAircraftId || propAircraft?.[0]?.id || "",
    startTime: formatDateForInput(startTime),
    endTime: formatDateForInput(endTime),
    instructorId: "",
    comments: "",
    flightTypeId: "",
  });

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs((prev) => [
      ...prev,
      `${new Date().toISOString()} - ${message}`,
    ]);
  };

  useEffect(() => {
    addDebugLog(`Props reçues:`);
    addDebugLog(`startTime: ${startTime}`);
    addDebugLog(`endTime: ${endTime}`);
    addDebugLog(`propAircraft: ${JSON.stringify(propAircraft)}`);
  }, [startTime, endTime, propAircraft]);

  useEffect(() => {
    addDebugLog(`Preselected aircraft ID: ${preselectedAircraftId}`);
    addDebugLog(`Initial formData: ${JSON.stringify(formData)}`);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        addDebugLog("Début du chargement des données");
        const [aircraftData, usersData, reservationsData] = await Promise.all([
          getAircraft(),
          getUsers(),
          getReservations(),
        ]);

        addDebugLog(`Aircraft data loaded: ${aircraftData.length} items`);
        addDebugLog(`Users data loaded: ${usersData.length} items`);

        const availableAircraft = aircraftData.filter(
          (a) => a.status === "AVAILABLE"
        );
        addDebugLog(`Available aircraft: ${availableAircraft.length} items`);

        const finalAircraft = propAircraft || aircraftData;
        addDebugLog(
          `Setting aircraft state with ${finalAircraft.length} items`
        );
        setAircraft(finalAircraft);

        const pilotsList = usersData.filter((u) => u.role === "PILOT");
        const instructorsList = usersData.filter(
          (u) => u.role === "INSTRUCTOR"
        );

        setPilots(pilotsList);
        setInstructors(instructorsList);
        setReservations(reservationsData);
      } catch (error) {
        addDebugLog(`Error loading data: ${error}`);
        console.error("Error loading data:", error);
        setError("Erreur lors du chargement des données");
      }
    };

    const loadFlightTypes = async () => {
      const { data } = await supabase
        .from("flight_types")
        .select("id, name, requires_instructor, accounting_category")
        .order("name");

      if (data) {
        setFlightTypes(data);
        // Set default flight type to 'local' if available
        const defaultType = data.find(
          (t) => t.accounting_category === "REGULAR"
        );
        if (defaultType) {
          setSelectedFlightType(defaultType.id);
          setFormData((prev) => ({
            ...prev,
            withInstructor: defaultType.requires_instructor,
          }));
        }
      }
    };

    loadData();
    loadFlightTypes();
  }, [propAircraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationError(null);

    const validationError = validateReservation(
      new Date(formData.startTime),
      new Date(formData.endTime),
      formData.aircraftId,
      reservations
    );

    if (validationError) {
      setValidationError(validationError.message);
      setLoading(false);
      return;
    }

    try {
      if (!selectedFlightType) throw new Error("Type de vol non sélectionné");

      await createReservation({
        userId: user?.id,
        pilotId: formData.pilotId,
        aircraftId: formData.aircraftId,
        flightTypeId: selectedFlightType,
        startTime: formData.startTime,
        endTime: formData.endTime,
        withInstructor: formData.withInstructor,
        instructorId: formData.instructorId || null,
        status: "ACTIVE",
        comments: formData.comments,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error creating reservation:", err);
      setError("Erreur lors de la création de la réservation");
    } finally {
      setLoading(false);
    }
  };

  const availablePilots = useMemo(() => {
    if (isAdmin) {
      return [...pilots, ...instructors];
    }
    if (isInstructor) {
      return pilots.filter(
        (pilot) => pilot.id === user?.id || formData.instructorId === user?.id
      );
    }
    return pilots.filter((pilot) => pilot.id === user?.id);
  }, [
    isAdmin,
    isInstructor,
    pilots,
    instructors,
    user?.id,
    formData.instructorId,
  ]);

  const handlePilotChange = (selectedPilotId: string) => {
    const selectedPilot = availablePilots.find((p) => p.id === selectedPilotId);

    setFormData((prev) => ({
      ...prev,
      pilotId: selectedPilotId,
      userId: isAdmin ? prev.userId : selectedPilotId,
      instructorId: selectedPilotId === user?.id ? "" : user?.id || "",
      withInstructor: isInstructor && selectedPilotId !== user?.id,
    }));
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

        {debugLogs.length > 0 && (
          <div className="p-4 bg-slate-800 text-slate-200 rounded-lg space-y-1 font-mono text-sm overflow-auto max-h-60 mx-6 mb-4">
            {debugLogs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {(error || validationError) && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error || validationError}</p>
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
                  setSelectedFlightType(e.target.value);
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
                  Date et heure de début
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
                  Date et heure de fin
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
                onChange={(e) => handlePilotChange(e.target.value)}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              >
                <option value="">Sélectionner un pilote</option>
                {availablePilots.map((pilot) => (
                  <option key={pilot.id} value={pilot.id}>
                    {pilot.firstName} {pilot.lastName}
                    {pilot.id === user?.id && " (moi-même)"}
                    {pilot.role === "INSTRUCTOR" && " (Instructeur)"}
                  </option>
                ))}
              </select>
            </div>

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
              >
                <option value="">Sans instructeur</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.firstName} {instructor.lastName}
                    {instructor.id === user?.id && " (moi-même)"}
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
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
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
