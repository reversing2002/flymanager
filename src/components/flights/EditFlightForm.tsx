import React, { useState, useEffect, useMemo } from "react";
import type { Aircraft, Flight, User, FlightType } from "../../types/database";
import { updateFlight } from "../../lib/queries";
import { useAuth } from "../../contexts/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../lib/supabase";
import { AlertTriangle } from "lucide-react";
import { hasAnyGroup } from "../../lib/permissions";
import TimeInput from "../common/TimeInput";
import { minutesToTimeFormat } from "../../lib/utils/timeFormat";
import { toast } from "react-hot-toast";
import { hourMeterToMinutes, validateHourMeter, formatHourMeter, parseHourMeter } from '../../lib/utils/hourMeter';

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
    start_hour_meter: flight.start_hour_meter,
    end_hour_meter: flight.end_hour_meter,
    // Forcer le mode de paiement à ACCOUNT
    paymentMethod: "ACCOUNT"
  });
  const [hourMeterInputs, setHourMeterInputs] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    const loadFlightTypes = async () => {
      try {
        const { data: types, error } = await supabase
          .from("flight_types")
          .select("*")
          .order("name");

        if (error) throw error;
        setFlightTypes(types || []);
      } catch (err) {
        console.error("Error loading flight types:", err);
        toast.error("Erreur lors du chargement des types de vol");
      }
    };

    loadFlightTypes();
  }, []);

  useEffect(() => {
    // Set default values when component mounts or flight changes
    if (currentUser && flight) {
      const isAdminOrInstructor = hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR"]);
      
      setFormData(prevData => ({
        ...prevData,
        // Préselectionner l'utilisateur courant comme pilote si ce n'est pas un admin/instructeur
        userId: !isAdminOrInstructor ? currentUser.id : flight.userId,
      }));
    }
  }, [currentUser, flight]);

  useEffect(() => {
    // Mettre à jour les données du formulaire quand le vol change
    const aircraft = aircraftList.find((a) => a.id === flight.aircraftId);
    const instructor = flight.instructorId ? users.find(u => u.id === flight.instructorId) : undefined;
    const duration = calculateDurationFromHourMeter(flight.start_hour_meter, flight.end_hour_meter);
    const { aircraftCost, instructorCost } = calculateCosts(duration, aircraft, instructor);

    setFormData(prevData => ({
      ...prevData,
      ...flight,
      date: new Date(flight.date).toISOString().split("T")[0],
      start_hour_meter: flight.start_hour_meter,
      end_hour_meter: flight.end_hour_meter,
      cost: aircraftCost,
      instructor_cost: instructorCost
    }));
  }, [flight, aircraftList, users]);

  useEffect(() => {
    const selectedAircraft = aircraftList.find(a => a.id === formData.aircraftId);
    setHourMeterInputs({
      start: formatHourMeter(formData.start_hour_meter, selectedAircraft?.hour_format) || '',
      end: formatHourMeter(formData.end_hour_meter, selectedAircraft?.hour_format) || ''
    });
  }, [formData.start_hour_meter, formData.end_hour_meter, formData.aircraftId, aircraftList]);

  // Fonction utilitaire pour vérifier si un utilisateur a un groupe spécifique
  const userHasGroup = (user: User, groupName: string) => {
    return user.user_group_memberships?.some(
      (membership) => membership.group.name === groupName
    );
  };

  // Get all pilots and instructors
  const pilots = useMemo(
    () => {
      return users.filter((u) => {
        const userRoles = u.roles || [];
        return userRoles.some(role => ["PILOT", "INSTRUCTOR"].includes(role));
      });
    },
    [users]
  );

  // Filter pilots based on permissions
  const availablePilots = useMemo(() => {
    if (!currentUser) return [];

    if (hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR"])) {
      return pilots;
    }

    // Pour les autres cas, montrer uniquement l'utilisateur courant
    return pilots.filter(pilot => pilot.id === currentUser.id);
  }, [pilots, currentUser]);

  const instructors = useMemo(() => {
    return users.filter((u) => {
      const userRoles = u.roles || [];
      return userRoles.includes("INSTRUCTOR");
    });
  }, [users]);

  const formatHorametre = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "";
    return value.toString().replace(".", ",");
  };

  const parseHorametre = (value: string): number | null => {
    if (!value) return null;
    // Remplacer la virgule par un point pour le parsing
    const parsed = parseFloat(value.replace(",", "."));
    return isNaN(parsed) ? null : parsed;
  };

  const calculateCost = (aircraftId: string, duration: number) => {
    const aircraft = aircraftList.find((a) => a.id === aircraftId);
    if (!aircraft) return 0;
    return (aircraft.hourlyRate * duration) / 60;
  };

  const calculateDurationFromHourMeter = (start: number | null, end: number | null): number => {
    if (start === null || end === null) return 0;
    const durationHours = end - start;
    return Math.round(durationHours * 60); // Convertir en minutes
  };

  const convertMinutesToDecimalHours = (minutes: number) => {
    return (minutes / 60).toFixed(2);
  };

  const calculateCosts = (duration: number, aircraft: Aircraft | undefined, instructor: User | undefined) => {
    console.log('=== Calcul des coûts ===');
    console.log('Duration:', duration);
    console.log('Aircraft:', aircraft);
    console.log('Instructor:', instructor);
    
    const aircraftCost = aircraft ? duration * (aircraft.hourlyRate / 60) : 0;
    // Access instructor_rate directly from the instructor object
    const instructorRate = instructor?.instructor_rate || 0;
    console.log('Instructor rate:', instructorRate);

    const instructorCost = instructorRate ? duration * (instructorRate / 60) : 0;
    console.log('Instructor cost calculation:', `${duration} * (${instructorRate} / 60) = ${instructorCost}`);

    return { aircraftCost, instructorCost };
  };

  const handleAircraftChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const aircraft = aircraftList.find((a) => a.id === e.target.value);
    
    setFormData({
      ...formData,
      aircraftId: e.target.value,
      hourlyRate: aircraft?.hourlyRate || 0,
    });
  };

  const handleInstructorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('=== Changement instructeur ===');
    const instructorId = e.target.value || null;
    console.log('Selected instructor ID:', instructorId);
    
    const instructor = instructorId ? users.find(u => u.id === instructorId) : undefined;
    console.log('Found instructor:', instructor);
    
    const aircraft = aircraftList.find(a => a.id === formData.aircraftId);
    const duration = calculateDurationFromHourMeter(formData.start_hour_meter, formData.end_hour_meter);
    console.log('Current duration:', duration);
    
    const { aircraftCost, instructorCost } = calculateCosts(duration, aircraft, instructor);
    console.log('Calculated costs:', { aircraftCost, instructorCost });

    setFormData(prev => {
      const newData = {
        ...prev,
        instructorId,
        instructor_cost: instructorCost
      };
      console.log('New form data:', newData);
      return newData;
    });
  };

  const handleHourMeterInputChange = (type: 'start' | 'end', value: string) => {
    // Mettre à jour l'état local immédiatement
    setHourMeterInputs(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleHourMeterBlur = (type: 'start' | 'end') => {
    const selectedAircraft = aircraftList.find(a => a.id === formData.aircraftId);
    const format = selectedAircraft?.hour_format || 'DECIMAL';
    const value = type === 'start' ? hourMeterInputs.start : hourMeterInputs.end;
    
    const numValue = parseHourMeter(value, format);
    if (numValue === null) {
      // Réinitialiser l'input à la valeur précédente
      setHourMeterInputs(prev => ({
        ...prev,
        [type]: formatHourMeter(formData[type === 'start' ? 'start_hour_meter' : 'end_hour_meter'], format)
      }));
      return;
    }
    
    if (!validateHourMeter(numValue, format)) {
      toast.error(format === 'DECIMAL' 
        ? "La valeur doit être positive" 
        : "Les minutes ne peuvent pas dépasser 59");
      // Réinitialiser l'input à la valeur précédente
      setHourMeterInputs(prev => ({
        ...prev,
        [type]: formatHourMeter(formData[type === 'start' ? 'start_hour_meter' : 'end_hour_meter'], format)
      }));
      return;
    }

    const updates: any = {
      [type === 'start' ? 'start_hour_meter' : 'end_hour_meter']: numValue
    };

    // Calculer la durée si les deux valeurs sont présentes
    if (type === 'start' && formData.end_hour_meter !== null) {
      const duration = hourMeterToMinutes(numValue, formData.end_hour_meter, format);
      updates.duration = duration;
      updates.cost = Math.round(duration * (formData.hourlyRate / 60));
    } else if (type === 'end' && formData.start_hour_meter !== null) {
      const duration = hourMeterToMinutes(formData.start_hour_meter, numValue, format);
      updates.duration = duration;
      updates.cost = Math.round(duration * (formData.hourlyRate / 60));
    }

    const aircraft = aircraftList.find(a => a.id === formData.aircraftId);
    const instructor = formData.instructorId ? users.find(u => u.id === formData.instructorId) : undefined;
    const { aircraftCost, instructorCost } = calculateCosts(updates.duration || 0, aircraft, instructor);

    setFormData(prev => ({
      ...prev,
      ...updates,
      instructor_cost: instructorCost
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Vérifier que la date n'est pas dans le futur
    const selectedDate = new Date(formData.date);
    const today = new Date();
    if (selectedDate > today) {
      setError("La date du vol ne peut pas être dans le futur");
      return;
    }

    // Vérifier si le vol est validé
    if (flight.isValidated) {
      throw new Error("Impossible de modifier un vol validé");
    }

    setLoading(true);
    try {
      const aircraft = aircraftList.find((a) => a.id === formData.aircraftId);
      const instructor = formData.instructorId ? users.find(u => u.id === formData.instructorId) : undefined;
      const duration = calculateDurationFromHourMeter(formData.start_hour_meter, formData.end_hour_meter);
      const { aircraftCost, instructorCost } = calculateCosts(duration, aircraft, instructor);

      const updatedData = {
        ...formData,
        hourlyRate: aircraft?.hourlyRate || 0,
        cost: aircraftCost,
        instructor_cost: instructorCost,
        duration,
        reservationId: formData.reservationId || null,
        instructorId: formData.instructorId || null,
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

  const selectedAircraft = aircraftList.find((a) => a.id === formData.aircraftId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span>{error}</span>
      </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type de vol */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Type de vol
          </label>
          <select
            name="flightTypeId"
            value={formData.flightTypeId}
            onChange={handleInputChange}
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

        {/* Pilote */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pilote
          </label>
          <select
            name="userId"
            value={formData.userId || ""}
            onChange={handleInputChange}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
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
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Instructeur
          </label>
          <select
            name="instructorId"
            value={formData.instructorId || ""}
            onChange={handleInstructorChange}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
          >
            <option value="">Aucun</option>
            {instructors.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.first_name} {instructor.last_name}
              </option>
            ))}
          </select>
        </div>

        {/* Avion */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Avion
          </label>
          <select
            name="aircraftId"
            value={formData.aircraftId}
            onChange={handleAircraftChange}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          >
            <option value="">Sélectionner un avion</option>
            {aircraftList.map((aircraft) => (
              <option key={aircraft.id} value={aircraft.id}>
                {aircraft.registration}
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

        {/* Horamètre départ */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Horamètre départ
          </label>
          <input
            type="text"
            name="start_hour_meter"
            value={hourMeterInputs.start}
            onChange={(e) => handleHourMeterInputChange('start', e.target.value)}
            onBlur={() => handleHourMeterBlur('start')}
            placeholder={selectedAircraft?.hour_format === 'CLASSIC' ? "Ex: 123.45" : "Ex: 123.5"}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          />
        </div>

        {/* Horamètre arrivée */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Horamètre arrivée
          </label>
          <input
            type="text"
            name="end_hour_meter"
            value={hourMeterInputs.end}
            onChange={(e) => handleHourMeterInputChange('end', e.target.value)}
            onBlur={() => handleHourMeterBlur('end')}
            placeholder={selectedAircraft?.hour_format === 'CLASSIC' ? "Ex: 123.45" : "Ex: 123.5"}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          />
        </div>

        {/* Durée (calculée) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Durée
          </label>
          <TimeInput
            value={formData.duration / 60} // Convertir les minutes en heures
            onChange={() => {}} // Read-only
            format={selectedAircraft?.hour_format || "DECIMAL"}
            disabled
          />
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

        {/* Coût d'instruction */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Coût d'instruction
          </label>
          <input
            type="text"
            value={formData.instructor_cost?.toFixed(2) || "0.00"}
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