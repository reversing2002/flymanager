import React, { useState, useEffect } from "react";
import type { Aircraft, Flight, User, FlightType } from "../../types/database";
import { updateFlight } from "../../lib/queries";
import { useAuth } from "../../contexts/AuthContext";
import { AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from 'uuid';

interface EditFlightFormProps {
  flight: Flight;
  onSuccess: () => void;
  onCancel: () => void;
  aircraftList: Aircraft[];
  users: User[];
}

const EditFlightForm: React.FC<EditFlightFormProps> = ({
  flight,
  onSuccess,
  onCancel,
  aircraftList,
  users,
}) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [formData, setFormData] = useState({
    ...flight,
    id: flight.id || uuidv4(),
    date: new Date(flight.date).toISOString().split("T")[0],
  });

  useEffect(() => {
    const loadFlightTypes = async () => {
      const { data, error } = await supabase
        .from('flight_types')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error loading flight types:', error);
        return;
      }
      
      setFlightTypes(data);
    };

    loadFlightTypes();
  }, []);

  const instructors = users.filter((u) => u.role === "INSTRUCTOR");

  const calculateCost = (aircraftId: string, duration: number) => {
    const aircraft = aircraftList.find((a) => a.id === aircraftId);
    if (!aircraft) return 0;
    return (aircraft.hourlyRate * duration) / 60;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const aircraft = aircraftList.find((a) => a.id === formData.aircraftId);
      if (!aircraft) throw new Error("Appareil non trouvé");

      // Recalculer le coût avec le tarif horaire de l'appareil
      const updatedData = {
        ...formData,
        hourlyRate: aircraft.hourlyRate,
        cost: calculateCost(formData.aircraftId, formData.duration),
      };

      await updateFlight(flight.id, updatedData);
      onSuccess();
    } catch (error: any) {
      console.error("Erreur complète:", error);
      setError(`Erreur lors de la modification du vol: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pilote */}
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
            disabled={currentUser?.role !== "ADMIN"}
          >
            <option value="">Sélectionner un pilote</option>
            {users
              .filter((u) => u.role === "PILOT" || u.role === "INSTRUCTOR")
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
          </select>
        </div>

        {/* Appareil */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Appareil
          </label>
          <select
            value={formData.aircraftId}
            onChange={(e) => {
              const aircraft = aircraftList.find((a) => a.id === e.target.value);
              setFormData({
                ...formData,
                aircraftId: e.target.value,
                hourlyRate: aircraft?.hourlyRate || 0,
                cost: calculateCost(e.target.value, formData.duration),
              });
            }}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          >
            <option value="">Sélectionner un appareil</option>
            {aircraftList.map((aircraft) => (
              <option key={aircraft.id} value={aircraft.id}>
                {aircraft.registration} - {aircraft.name} - {aircraft.hourlyRate.toFixed(2)}€/h
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

        {/* Durée */}
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

        {/* Type de vol */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Type de vol
          </label>
          <select
            value={formData.flightTypeId}
            onChange={(e) => {
              const selectedType = flightTypes.find(t => t.id === e.target.value);
              setFormData({ 
                ...formData, 
                flightTypeId: e.target.value,
                instructorId: selectedType?.requires_instructor ? formData.instructorId : ""
              });
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

        {/* Instructeur */}
        {flightTypes.find(t => t.id === formData.flightTypeId)?.requires_instructor && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Instructeur
            </label>
            <select
              value={formData.instructorId || ""}
              onChange={(e) =>
                setFormData({ ...formData, instructorId: e.target.value || null })
              }
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            >
              <option value="">Sélectionner un instructeur</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.firstName} {instructor.lastName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mode de paiement */}
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

        {/* Tarif horaire (en lecture seule) */}
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

        {/* Coût calculé */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Coût du vol
          </label>
          <input
            type="text"
            value={formData.cost?.toFixed(2) || "0.00"}
            readOnly
            className="w-full rounded-lg bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Boutons */}
      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
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
          {loading ? "Modification..." : "Modifier"}
        </button>
      </div>
    </form>
  );
};

export default EditFlightForm;