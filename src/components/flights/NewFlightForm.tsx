import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { Aircraft, FlightType, User } from "../../types/database";
import { createFlight, getUsers } from "../../lib/queries";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

interface NewFlightFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  aircraftList: Aircraft[];
  users?: User[]; // Ajout de la prop users optionnelle
}

const NewFlightForm: React.FC<NewFlightFormProps> = ({
  onSuccess,
  onCancel,
  aircraftList: propAircraftList,
  users: propUsers,
}) => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [users, setUsers] = useState(propUsers || []);
  const [aircraft, setAircraft] = useState<Aircraft[]>(propAircraftList || []);

  // Initialiser formData avec les données de la réservation si disponible
  const [formData, setFormData] = useState(() => {
    const reservation = location.state?.reservation;
    const selectedAircraft = location.state?.selectedAircraft;
    const pilot = location.state?.pilot;
    const duration = location.state?.duration;
    const date = location.state?.date;

    const cost = selectedAircraft
      ? (selectedAircraft.hourlyRate * (duration || 60)) / 60
      : 0;

    return {
      id: uuidv4(),
      userId: pilot?.id || currentUser?.id || "",
      pilotId: pilot?.id || currentUser?.id || "",
      aircraftId: selectedAircraft?.id || "",
      date: date || new Date().toISOString().split("T")[0],
      duration: duration || 60,
      flightTypeId: reservation?.flightTypeId || "",
      instructorId: location.state?.instructor?.id || null,
      destination: "",
      paymentMethod: "ACCOUNT",
      hourlyRate: selectedAircraft?.hourlyRate || 0,
      cost: cost,
      reservationId: reservation?.id || null,
    };
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load flight types
        const { data: flightTypesData, error: flightTypesError } =
          await supabase.from("flight_types").select("*").order("name");

        if (flightTypesError) throw flightTypesError;
        if (flightTypesData) {
          setFlightTypes(flightTypesData);
        }

        // Load users only if not provided through props or state
        if (!propUsers && !location.state?.users) {
          const usersData = await getUsers();
          setUsers(usersData);
        } else if (location.state?.users) {
          setUsers(location.state.users);
        }

        // Si on vient de TimeGrid, utiliser la liste d'avions fournie
        if (location.state?.aircraftList) {
          setAircraft(location.state.aircraftList);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Erreur lors du chargement des données");
      }
    };

    loadData();
  }, [propUsers, location.state]);

  // Définir pilots et instructors à partir des users
  const pilots = useMemo(
    () => users.filter((u) => u.role === "PILOT" || u.role === "INSTRUCTOR"),
    [users]
  );
  const instructors = useMemo(
    () => users.filter((u) => u.role === "INSTRUCTOR"),
    [users]
  );

  // Filter pilots based on permissions
  const availablePilots = useMemo(() => {
    if (currentUser?.role === "ADMIN") {
      return [...pilots, ...instructors]; // Admin voit tous les utilisateurs
    }
    if (currentUser?.role === "INSTRUCTOR") {
      return pilots.filter(
        (pilot) =>
          pilot.id === currentUser?.id || // Lui-même
          formData.instructorId === currentUser?.id // Ses élèves
      );
    }
    // Pilote normal ne voit que lui-même
    return pilots.filter((pilot) => pilot.id === currentUser?.id);
  }, [
    currentUser?.role,
    pilots,
    instructors,
    currentUser?.id,
    formData.instructorId,
  ]);

  const calculateCost = (aircraftId: string, duration: number) => {
    const selectedAircraft = aircraft?.find((a) => a.id === aircraftId);
    if (!selectedAircraft) return 0;
    return (selectedAircraft.hourlyRate * duration) / 60;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Vérifier si un vol existe déjà pour cette réservation
      if (formData.reservationId) {
        const { data: existingFlight } = await supabase
          .from("flights")
          .select("id")
          .eq("reservation_id", formData.reservationId)
          .maybeSingle();

        if (existingFlight) {
          toast.error("Un vol existe déjà pour cette réservation");
          setError("Un vol existe déjà pour cette réservation");
          setLoading(false);
          return;
        }
      }

      const selectedAircraft = aircraft?.find(
        (a) => a.id === formData.aircraftId
      );
      if (!selectedAircraft) throw new Error("Appareil non trouvé");

      // Prepare flight data
      const flightData = {
        ...formData,
        hourlyRate: selectedAircraft.hourlyRate,
        cost: calculateCost(formData.aircraftId, formData.duration),
      };

      await createFlight(flightData);
      toast.success("Vol créé avec succès");

      // Si on vient du TimeGrid, rediriger vers /flights
      if (location.state?.fromTimeGrid) {
        navigate("/flights");
      } else {
        // Sinon, utiliser le callback onSuccess normal
        onSuccess?.();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      console.error("Erreur complète:", err);
      setError(`Erreur lors de la création du vol: ${errorMessage}`);
      toast.error("Erreur lors de la création du vol");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pilot */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pilote
          </label>
          <select
            value={formData.userId}
            onChange={(e) =>
              setFormData({ ...formData, userId: e.target.value })
            }
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
            disabled={currentUser?.role === "PILOT"}
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

        {/* Aircraft */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Appareil
          </label>
          <select
            value={formData.aircraftId}
            onChange={(e) => {
              const newAircraftId = e.target.value;
              const selectedAircraft = aircraft.find(
                (a) => a.id === newAircraftId
              );
              setFormData({
                ...formData,
                aircraftId: newAircraftId,
                hourlyRate: selectedAircraft?.hourlyRate || 0,
                cost: calculateCost(newAircraftId, formData.duration),
              });
            }}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          >
            <option value="">Sélectionner un appareil</option>
            {aircraft.map((ac) => (
              <option key={ac.id} value={ac.id}>
                {ac.registration} - {ac.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Durée (minutes)
          </label>
          <input
            type="number"
            value={formData.duration || ""}
            onChange={(e) => {
              const duration = parseInt(e.target.value) || 0;
              setFormData({
                ...formData,
                duration,
                cost: calculateCost(formData.aircraftId, duration),
              });
            }}
            min="1"
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          />
        </div>

        {/* Flight Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Type de vol
          </label>
          <select
            value={formData.flightTypeId}
            onChange={(e) => {
              const selectedType = flightTypes.find(
                (t) => t.id === e.target.value
              );
              setFormData({
                ...formData,
                flightTypeId: e.target.value,
                instructorId: selectedType?.requires_instructor
                  ? formData.instructorId
                  : null,
              });
            }}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          >
            <option value="">Sélectionner un type</option>
            {flightTypes?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Destination
          </label>
          <input
            type="text"
            value={formData.destination || ""}
            onChange={(e) =>
              setFormData({ ...formData, destination: e.target.value })
            }
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            placeholder="LFXX ou Local"
          />
        </div>

        {/* Instructor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Instructeur
          </label>
          <select
            value={formData.instructorId || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                instructorId: e.target.value || null,
              })
            }
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          >
            <option value="">Sans instructeur</option>
            {instructors?.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.firstName} {instructor.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Mode de paiement
          </label>
          <select
            value={formData.paymentMethod}
            onChange={(e) =>
              setFormData({ ...formData, paymentMethod: e.target.value })
            }
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          >
            <option value="ACCOUNT">Compte</option>
            <option value="CARD">Carte</option>
            <option value="CASH">Espèces</option>
            <option value="TRANSFER">Virement</option>
          </select>
        </div>

        {/* Hourly Rate (readonly) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tarif horaire
          </label>
          <input
            type="text"
            value={formData.hourlyRate?.toFixed(2) || "0.00"}
            readOnly
            className="w-full rounded-lg bg-slate-50 border-slate-200"
          />
        </div>

        {/* Calculated Cost */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Coût du vol
          </label>
          <input
            type="text"
            value={calculateCost(
              formData.aircraftId,
              formData.duration
            ).toFixed(2)}
            readOnly
            className="w-full rounded-lg bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={() => navigate("/flights")}
          className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-800"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Création..." : "Créer"}
        </button>
      </div>
    </form>
  );
};

export default NewFlightForm;
