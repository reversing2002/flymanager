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
    userId?: string;
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
      userId: initialData?.userId || currentUser?.id || "",
      aircraftId: initialData?.aircraftId || "",
      flightTypeId: "",  // Sera mis à jour une fois les types de vol chargés
      instructorId: initialData?.instructorId || null,
      reservationId: initialData?.reservationId || null,
      date: initialData?.date || new Date().toISOString().split("T")[0],
      start_hour_meter: aircraft?.last_hour_meter || null,
      end_hour_meter: aircraft?.last_hour_meter || null,
      duration: durationInMinutes,
      cost: cost,
      hourlyRate: hourlyRate,
      instructor_cost: 0,
      instructor_fee: 0,
      comments: "",
      isValidated: false,
      // Définir ACCOUNT comme valeur par défaut pour le mode de paiement
      paymentMethod: "ACCOUNT",
      accountingCategory: "LOCAL",
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
        // Charger les types de vol avec leurs catégories comptables
        const { data: flightTypesData, error: flightTypesError } = await supabase
          .from("flight_types")
          .select(`
            *,
            accounting_category:accounting_category_id (
              id,
              name,
              is_club_paid
            )
          `)
          .order("display_order");

        if (flightTypesError) throw flightTypesError;

        setFlightTypes(flightTypesData || []);

        // Recherche du type de vol par défaut
        const defaultFlightType = flightTypesData?.find((type) => type.is_default);
        
        if (defaultFlightType && defaultFlightType.accounting_category) {
          setFormData((prev) => ({
            ...prev,
            flightTypeId: defaultFlightType.id,
            accountingCategory: defaultFlightType.accounting_category.id,
          }));
        } else if (defaultFlightType) {
          setFormData((prev) => ({
            ...prev,
            flightTypeId: defaultFlightType.id,
          }));
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

  const calculateCosts = (duration: number, aircraft: Aircraft | undefined, instructor: User | undefined) => {
    console.log('=== Calcul des coûts ===');
    console.log('Duration:', duration);
    console.log('Aircraft:', aircraft);
    console.log('Instructor:', instructor);

    const aircraftCost = aircraft ? (aircraft.hourly_rate * duration) / 60 : 0;
    let instructorCost = 0;
    let instructorFee = 0;

    if (instructor && duration > 0) {
      // Calcul du coût facturé pour l'instruction
      if (instructor.instructor_rate) {
        instructorCost = (parseFloat(instructor.instructor_rate) * duration) / 60;
      }
      // Calcul du montant à reverser à l'instructeur
      if (instructor.instructor_fee) {
        instructorFee = (parseFloat(instructor.instructor_fee) * duration) / 60;
      }
    }

    console.log('Aircraft cost:', aircraftCost);
    console.log('Instructor cost:', instructorCost);
    console.log('Instructor fee:', instructorFee);

    return { aircraftCost, instructorCost, instructorFee };
  };

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
      instructor_cost: 0,
      instructor_fee: 0,
    });
  };

  const handleInstructorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('=== Changement instructeur ===');
    const instructorId = e.target.value || null;
    console.log('Selected instructor ID:', instructorId);
    
    const instructor = instructorId ? users.find(u => u.id === instructorId) : undefined;
    console.log('Found instructor:', instructor);
    
    const selectedAircraft = aircraft.find(a => a.id === formData.aircraftId);
    const duration = calculateDurationFromHourMeter(formData.start_hour_meter, formData.end_hour_meter);
    console.log('Current duration:', duration);
    
    const { aircraftCost, instructorCost, instructorFee } = calculateCosts(duration, selectedAircraft, instructor);
    console.log('Calculated costs:', { aircraftCost, instructorCost, instructorFee });

    setFormData(prev => {
      const newData = {
        ...prev,
        instructorId,
        instructor_cost: instructorCost,
        instructor_fee: instructorFee
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

  const handleHourMeterBlur = (type: 'start' | 'end', value: string) => {
    console.log('=== handleHourMeterBlur ===');
    if (!validateHourMeter(value)) return;

    const numValue = parseHourMeter(value);
    if (numValue === null) return;

    const updates: Partial<typeof formData> = {
      [`${type}_hour_meter`]: numValue
    };

    if (type === 'start' && formData.end_hour_meter !== null) {
      const duration = calculateDurationFromHourMeter(numValue, formData.end_hour_meter);
      updates.duration = duration;
      const selectedAircraft = aircraft.find(a => a.id === formData.aircraftId);
      const instructor = formData.instructorId ? users.find(u => u.id === formData.instructorId) : undefined;
      const { aircraftCost, instructorCost, instructorFee } = calculateCosts(duration, selectedAircraft, instructor);
      updates.cost = aircraftCost;
      updates.instructor_cost = instructorCost;
      updates.instructor_fee = instructorFee;
    } else if (type === 'end' && formData.start_hour_meter !== null) {
      const duration = calculateDurationFromHourMeter(formData.start_hour_meter, numValue);
      updates.duration = duration;
      const selectedAircraft = aircraft.find(a => a.id === formData.aircraftId);
      const instructor = formData.instructorId ? users.find(u => u.id === formData.instructorId) : undefined;
      const { aircraftCost, instructorCost, instructorFee } = calculateCosts(duration, selectedAircraft, instructor);
      updates.cost = aircraftCost;
      updates.instructor_cost = instructorCost;
      updates.instructor_fee = instructorFee;
    }

    console.log('Updates:', updates);
    setFormData(prev => ({
      ...prev,
      ...updates
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

    setLoading(true);
    try {
      if (!formData.userId || !formData.aircraftId) {
        throw new Error("Veuillez remplir tous les champs obligatoires");
      }

      // Créer le vol
      const selectedAircraft = aircraft.find(a => a.id === formData.aircraftId);
      const instructor = formData.instructorId ? users.find(u => u.id === formData.instructorId) : undefined;
      const duration = calculateDurationFromHourMeter(formData.start_hour_meter, formData.end_hour_meter);
      const { aircraftCost, instructorCost, instructorFee } = calculateCosts(duration, selectedAircraft, instructor);

      const flightData = {
        ...formData,
        id: uuidv4(),
        cost: aircraftCost,
        instructor_cost: instructorCost,
        instructor_fee: instructorFee,
        duration
      };

      console.log('Creating flight with data:', flightData);

      const { data: flight, error: flightError } = await supabase
        .from("flights")
        .insert({
          id: flightData.id,
          user_id: flightData.userId,
          aircraft_id: flightData.aircraftId,
          flight_type_id: flightData.flightTypeId,
          instructor_id: flightData.instructorId || null,
          reservation_id: flightData.reservationId || null,
          date: flightData.date,
          duration: flightData.duration,
          destination: flightData.destination || null,
          hourly_rate: flightData.hourlyRate,
          cost: flightData.cost,
          payment_method: flightData.paymentMethod,
          start_hour_meter: flightData.start_hour_meter,
          end_hour_meter: flightData.end_hour_meter,
          is_validated: false,
          instructor_cost: flightData.instructor_cost,
          instructor_fee: flightData.instructor_fee,
          club_id: flightData.clubId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (flightError) throw flightError;

      // Trouver le type de compte "VOL"
      const { data: accountTypes } = await supabase
        .from("account_entry_types")
        .select("*")
        .eq("code", "FLIGHT")
        .single();

      if (!accountTypes) {
        throw new Error("Type de compte VOL non trouvé");
      }

      // Créer l'écriture comptable
      const { error: accountError } = await supabase
        .from("account_entries")
        .insert({
          id: uuidv4(),
          user_id: flightData.userId,
          entry_type_id: accountTypes.id,
          date: flightData.date,
          amount: -Math.abs(flightData.cost),
          payment_method: flightData.paymentMethod,
          description: `Vol ${selectedAircraft?.registration} - ${convertMinutesToDecimalHours(flightData.duration)}h`,
          flight_id: flight.id,
          assigned_to_id: flightData.userId,
          is_validated: false,
          is_club_paid: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (accountError) throw accountError;

      // Si il y a un instructeur, créer une écriture comptable pour le coût d'instruction
      if (flightData.instructorId && flightData.instructor_cost) {
        const { error: instructorAccountError } = await supabase
          .from("account_entries")
          .insert({
            id: uuidv4(),
            user_id: flightData.userId,
            entry_type_id: accountTypes.id,
            date: flightData.date,
            amount: -Math.abs(flightData.instructor_cost),
            payment_method: flightData.paymentMethod,
            description: `Instruction vol du ${new Date(flightData.date).toLocaleDateString()} - ${convertMinutesToDecimalHours(flightData.duration)}h`,
            flight_id: flight.id,
            assigned_to_id: flightData.userId,
            is_validated: false,
            is_club_paid: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (instructorAccountError) throw instructorAccountError;
      }

      // Si il y a un instructeur, créer une écriture comptable pour le montant à reverser à l'instructeur
      if (flightData.instructorId && flightData.instructor_fee) {
        const { error: instructorFeeAccountError } = await supabase
          .from("account_entries")
          .insert({
            id: uuidv4(),
            user_id: flightData.instructorId,
            entry_type_id: accountTypes.id,
            date: flightData.date,
            amount: Math.abs(flightData.instructor_fee),
            payment_method: flightData.paymentMethod,
            description: `Vol du ${new Date(flightData.date).toLocaleDateString()} - ${convertMinutesToDecimalHours(flightData.duration)}h`,
            flight_id: flight.id,
            assigned_to_id: flightData.instructorId,
            is_validated: false,
            is_club_paid: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (instructorFeeAccountError) throw instructorFeeAccountError;
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating flight:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue');
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
            onBlur={(e) => handleHourMeterBlur('start', e.target.value)}
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
            onBlur={(e) => handleHourMeterBlur('end', e.target.value)}
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

        {/* Montant à reverser à l'instructeur */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Montant à reverser à l'instructeur
          </label>
          <input
            type="text"
            value={formData.instructor_fee?.toFixed(2) || "0.00"}
            readOnly
            className="w-full rounded-lg bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Buttons */}
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
          {loading ? "Création..." : "Créer"}
        </button>
      </div>
    </form>
  );
};

export default NewFlightForm;
