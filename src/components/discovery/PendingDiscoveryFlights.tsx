import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { useToast } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import ReservationModal from "../reservations/ReservationModal";

interface DiscoveryFlight {
  id: string;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  pilot_id: string | null;
  aircraft_id: string | null;
  status: string;
  passenger_count: number;
  preferred_dates: string;
  contact_email: string;
  contact_phone: string;
  total_weight: number;
  comments: string;
  aircraft?: {
    id: string;
    registration: string;
    name: string;
  };
}

interface Aircraft {
  id: string;
  registration: string;
  name: string;
}

interface Props {
  className?: string;
}

export default function PendingDiscoveryFlights({ className }: Props) {
  const [flights, setFlights] = useState<DiscoveryFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<DiscoveryFlight | null>(null);
  const [discoveryFlightTypeId, setDiscoveryFlightTypeId] = useState<string | null>(null);
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<any>(null);
  const [selectedAircraft, setSelectedAircraft] = useState<any>(null);
  const { user } = useAuth();
  const toast = useToast();

  const fetchFlightTypes = async () => {
    const { data, error } = await supabase
      .from("flight_types")
      .select("id")
      .eq("name", "Vol Découverte")
      .single();

    if (error) {
      console.error("Error fetching flight type:", error);
      return;
    }

    setDiscoveryFlightTypeId(data.id);
  };

  const fetchAircraft = async (passengerCount: number) => {
    const { data, error } = await supabase
      .from("aircraft")
      .select("*")
      .eq("status", "AVAILABLE")
      .gte("capacity", passengerCount + 1); // +1 pour le pilote

    if (error) {
      console.error("Error fetching aircraft:", error);
      return;
    }

    setAircraftList(data || []);
  };

  useEffect(() => {
    fetchFlightTypes();
  }, []);

  const fetchFlights = async () => {
    if (!user) return;

    const canViewFlights = hasAnyGroup(user, ["ADMIN", "DISCOVERY_PILOT"]);
    if (!canViewFlights) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("discovery_flights")
      .select(`
        *,
        aircraft:aircraft_id (
          id,
          registration,
          name
        )
      `)
      .is("pilot_id", null)
      .in("status", ["PENDING", "REQUESTED"])
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching discovery flights:", error);
    } else {
      setFlights(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFlights();
  }, [user]);

  const handleAssignFlight = async (flight: DiscoveryFlight) => {
    setSelectedFlight(flight);
    await fetchAircraft(flight.passenger_count);
    setShowReservationModal(true);
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-20 bg-slate-200 rounded-lg"></div>
        <div className="h-20 bg-slate-200 rounded-lg"></div>
        <div className="h-20 bg-slate-200 rounded-lg"></div>
      </div>
    );
  }

  if (!hasAnyGroup(user, ["ADMIN", "DISCOVERY_PILOT"])) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Vols découverte en attente</h2>
        <Link 
          to="/discovery-flights"
          className="text-sm text-sky-600 hover:text-sky-700"
        >
          Voir tout
        </Link>
      </div>
      
      {flights.length === 0 ? (
        <div className="text-center py-6">
          <CalendarClock className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-2 text-sm font-semibold text-slate-900">
            Aucun vol en attente
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Tous les vols découverte ont un pilote assigné.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => (
            <div
              key={flight.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-slate-100"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {flight.preferred_dates}
                    </span>
                    {flight.date && (
                      <span className="text-xs text-slate-500">
                        {format(new Date(flight.date), "d MMMM", { locale: fr })}
                      </span>
                    )}
                    {flight.start_time && (
                      <span className="text-xs text-slate-500">
                        {format(new Date(`2000-01-01T${flight.start_time}`), "HH:mm")}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-slate-600">
                      {flight.passenger_count} passager{flight.passenger_count > 1 ? 's' : ''}
                    </p>
                    <div className="mt-1 text-xs text-slate-500">
                      <div>Email: {flight.contact_email}</div>
                      <div>Tel: {flight.contact_phone}</div>
                      {flight.comments && <div>Commentaires: {flight.comments}</div>}
                      <div>Poids total: {flight.total_weight}kg</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleAssignFlight(flight)}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
                >
                  Devenir pilote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Modal de réservation */}
      {showReservationModal && selectedFlight && (
        <ReservationModal
          startTime={selectedFlight.start_time ? new Date(`2000-01-01T${selectedFlight.start_time}`) : new Date()}
          endTime={selectedFlight.end_time ? new Date(`2000-01-01T${selectedFlight.end_time}`) : new Date()}
          onClose={() => {
            setShowReservationModal(false);
            setSelectedFlight(null);
          }}
          onSuccess={async () => {
            try {
              // Récupérer les valeurs du formulaire depuis le modal
              const { error } = await supabase
                .from("discovery_flights")
                .update({ 
                  pilot_id: user?.id,
                  status: 'CONFIRMED',
                  date: selectedTimeSlot?.startTime,
                  start_time: selectedTimeSlot ? format(new Date(selectedTimeSlot.startTime), 'HH:mm:ss') : null,
                  end_time: selectedTimeSlot ? format(new Date(selectedTimeSlot.endTime), 'HH:mm:ss') : null,
                  aircraft_id: selectedAircraft?.id
                })
                .eq("id", selectedFlight.id);

              if (error) throw error;

              fetchFlights();
              toast({
                title: "Vol attribué",
                description: "Vous êtes maintenant le pilote de ce vol découverte",
                status: "success",
                duration: 5000,
                isClosable: true,
              });
            } catch (error) {
              console.error("Erreur lors de l'attribution du vol:", error);
              toast({
                title: "Erreur",
                description: "Impossible d'attribuer le vol",
                status: "error",
                duration: 5000,
                isClosable: true,
              });
            } finally {
              setShowReservationModal(false);
              setSelectedFlight(null);
            }
          }}
          aircraft={aircraftList}
          users={[]}
          comments={`Vol découverte - ${selectedFlight.passenger_count} passager(s)
Contact: ${selectedFlight.contact_email} / ${selectedFlight.contact_phone}
Poids total: ${selectedFlight.total_weight}kg
${selectedFlight.comments ? `Commentaires: ${selectedFlight.comments}` : ''}`}
          preselectedFlightTypeId={discoveryFlightTypeId || undefined}
          setSelectedTimeSlot={setSelectedTimeSlot}
          setSelectedAircraft={setSelectedAircraft}
        />
      )}
    </div>
  );
}
