import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import type { Aircraft, FlightType, User } from "../../types/database";
import { createFlight, getUsers } from "../../lib/queries/index";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { hasAnyGroup } from "../../lib/permissions";
import { hourMeterToMinutes, validateHourMeter, formatHourMeter, parseHourMeter } from '@/lib/utils/hourMeter';

interface NewFlightFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  aircraftList: Aircraft[];
  users?: User[];
  initialData?: {
    date?: string;
    pilotId?: string;
    instructorId?: string;
    aircraftId?: string;
    flightTypeId?: string;
    reservationId?: string;
    duration?: number;
  };
}

const NewFlightForm: React.FC<NewFlightFormProps> = ({
  onSuccess,
  onCancel,
  aircraftList: propAircraftList,
  users: propUsers,
  initialData,
}) => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flightTypes, setFlightTypes] = useState<FlightType[]>([]);
  const [users, setUsers] = useState(propUsers || []);
  const [aircraft, setAircraft] = useState<Aircraft[]>(propAircraftList || []);

  const [formData, setFormData] = useState(() => {
    // Trouver l'avion sélectionné si un ID est fourni
    const aircraft = initialData?.aircraftId 
      ? propAircraftList.find(a => a.id === initialData.aircraftId)
      : undefined;
    
    const hourlyRate = aircraft?.hourlyRate || 0;
    const durationInMinutes = initialData?.duration || 60;
    const cost = (hourlyRate * durationInMinutes) / 60;

    return {
      id: uuidv4(),
      userId: initialData?.pilotId || currentUser?.id || "",
      pilotId: initialData?.pilotId || currentUser?.id || "",
      aircraftId: initialData?.aircraftId || "",
      flightTypeId: initialData?.flightTypeId || "",
      instructorId: initialData?.instructorId || null,
      reservationId: initialData?.reservationId || null,
      date: initialData?.date || new Date().toISOString().split("T")[0],
      start_hour_meter: aircraft?.last_hour_meter || null,
      end_hour_meter: aircraft?.last_hour_meter || null,
      duration: durationInMinutes,
      cost: cost,
      hourlyRate: hourlyRate,
      comments: "",
      isValidated: false,
      paymentMethod: "ACCOUNT",
      accountingCategory: "",
      clubId: currentUser?.club?.id,
    };
  });

  const [hourMeterInputs, setHourMeterInputs] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    const selectedAircraft = aircraft?.find(a => a.id === formData.aircraftId);
    setHourMeterInputs({
      start: formatHourMeter(formData.start_hour_meter, selectedAircraft?.hour_format) || '',
      end: formatHourMeter(formData.end_hour_meter, selectedAircraft?.hour_format) || ''
    });
  }, [formData.start_hour_meter, formData.end_hour_meter, formData.aircraftId, aircraft]);

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
          console.log("Loading users from API");
          const usersData = await getUsers();
          console.log("Loaded users:", usersData);
          setUsers(usersData);
        } else if (location.state?.users) {
          console.log("Using users from location state:", location.state.users);
          setUsers(location.state.users);
        } else if (propUsers) {
          console.log("Using users from props:", propUsers);
          setUsers(propUsers);
        }

        // If coming from TimeGrid, use the provided aircraft list
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

  useEffect(() => {
    // Set default values when component mounts
    if (currentUser && !formData.userId) {
      const isAdminOrInstructor = hasAnyGroup(currentUser, ["ADMIN", "INSTRUCTOR"]);
      
      setFormData(prevData => ({
        ...prevData,
        // Préselectionner l'utilisateur courant comme élève si ce n'est pas un admin/instructeur
        userId: !isAdminOrInstructor ? currentUser.id : "",
      }));
    }
  }, [currentUser]);

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

  const instructors = useMemo(
    () => {
      return users.filter((u) => {
        const userRoles = u.roles || [];
        return userRoles.includes("INSTRUCTOR");
      });
    },
    [users]
  );

  const calculateCost = (aircraftId: string, duration: number) => {
    const selectedAircraft = aircraft?.find((a) => a.id === aircraftId);
    if (!selectedAircraft) return 0;
    return Math.round((selectedAircraft.hourlyRate * duration) / 60);
  };

  const calculateDurationFromHourMeter = (start: number, end: number, format: 'DECIMAL' | 'CLASSIC' = 'DECIMAL') => {
    return hourMeterToMinutes(start, end, format);
  };

  const convertMinutesToDecimalHours = (minutes: number) => {
    return (minutes / 60).toFixed(2);
  };

  const handleAircraftChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedAircraft = aircraft?.find((a) => a.id === e.target.value);
    const startHourMeter = selectedAircraft?.last_hour_meter || 0;
    
    setFormData({
      ...formData,
      aircraftId: e.target.value,
      hourlyRate: selectedAircraft?.hourlyRate || 0,
      start_hour_meter: startHourMeter,
      end_hour_meter: startHourMeter,
      duration: 0,
      cost: 0,
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
    const selectedAircraft = aircraft?.find(a => a.id === formData.aircraftId);
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

    if (type === 'start' && formData.end_hour_meter !== null) {
      const duration = calculateDurationFromHourMeter(numValue, formData.end_hour_meter, format);
      updates.duration = duration;
      updates.cost = calculateCost(formData.aircraftId, duration);
    } else if (type === 'end' && formData.start_hour_meter !== null) {
      const duration = calculateDurationFromHourMeter(formData.start_hour_meter, numValue, format);
      updates.duration = duration;
      updates.cost = calculateCost(formData.aircraftId, duration);
    }

    setFormData({
      ...formData,
      ...updates
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Récupérer le type de compte pour les vols
      const { data: accountTypes, error: typesError } = await supabase
        .from("account_entry_types")
        .select("id")
        .eq("code", "FLIGHT")
        .single();

      if (typesError || !accountTypes) {
        throw new Error("Type de compte 'FLIGHT' non trouvé");
      }

      // Créer le vol
      const { data: flight, error: flightError } = await supabase
        .from("flights")
        .insert({
          id: formData.id,
          user_id: formData.userId,
          aircraft_id: formData.aircraftId,
          flight_type_id: formData.flightTypeId,
          instructor_id: formData.instructorId || null,
          reservation_id: formData.reservationId || null,
          date: formData.date,
          duration: formData.duration,
          destination: formData.destination || null,
          hourly_rate: formData.hourlyRate,
          cost: formData.cost,
          payment_method: formData.paymentMethod,
          start_hour_meter: formData.start_hour_meter,
          end_hour_meter: formData.end_hour_meter,
          is_validated: false,
          instructor_fee: 0,
          club_id: formData.clubId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (flightError || !flight) {
        throw flightError || new Error("Erreur lors de la création du vol");
      }

      // Créer l'entrée comptable
      const { error: accountError } = await supabase
        .from("account_entries")
        .insert({
          id: uuidv4(),
          user_id: formData.userId,
          entry_type_id: accountTypes.id,
          date: formData.date,
          amount: -Math.abs(formData.cost),
          payment_method: formData.paymentMethod,
          description: `Vol ${aircraft.find(a => a.id === formData.aircraftId)?.registration} - ${convertMinutesToDecimalHours(formData.duration)}h`,
          flight_id: flight.id,
          assigned_to_id: formData.userId,
          is_validated: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (accountError) {
        throw accountError;
      }

      onSuccess();
    } catch (err) {
      console.error("Error creating flight:", err);
      setError("Erreur lors de la création du vol");
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
        {/* Aircraft */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Appareil
          </label>
          <select
            value={formData.aircraftId}
            onChange={handleAircraftChange}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          >
            <option value="">Sélectionner un appareil</option>
            {aircraft.map((a) => (
              <option key={a.id} value={a.id}>
                {a.registration} - {a.name} - {a.hourlyRate.toFixed(2)}€/h
              </option>
            ))}
          </select>
        </div>

        {/* Horamètre de début */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Horamètre début
          </label>
          <input
            type="text"
            name="start_hour_meter"
            value={hourMeterInputs.start}
            onChange={(e) => handleHourMeterInputChange('start', e.target.value)}
            onBlur={() => handleHourMeterBlur('start')}
            placeholder={aircraft?.find(a => a.id === formData.aircraftId)?.hour_format === 'CLASSIC' ? "Ex: 123.45" : "Ex: 123.5"}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          />
        </div>

        {/* Horamètre de fin */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Horamètre fin
          </label>
          <input
            type="text"
            name="end_hour_meter"
            value={hourMeterInputs.end}
            onChange={(e) => handleHourMeterInputChange('end', e.target.value)}
            onBlur={() => handleHourMeterBlur('end')}
            placeholder={aircraft?.find(a => a.id === formData.aircraftId)?.hour_format === 'CLASSIC' ? "Ex: 123.45" : "Ex: 123.5"}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          />
        </div>

        {/* Durée (calculée) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Durée (minutes)
          </label>
          <input
            type="number"
            value={formData.duration || ""}
            className="w-full rounded-lg border-slate-200 bg-slate-50 text-slate-500"
            disabled
          />
          <p className="mt-1 text-sm text-slate-500">
            {formData.duration ? `${convertMinutesToDecimalHours(formData.duration)} heures` : ''}
          </p>
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

        {/* Pilote */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pilote
          </label>
          <select
            name="userId"
            value={formData.userId}
            onChange={handleInputChange}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
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

        {/* Instructor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Instructeur
          </label>
          <select
            name="instructorId"
            value={formData.instructorId || ""}
            onChange={handleInputChange}
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

        {/* Flight Type */}
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
