import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "../../contexts/AuthContext";
import { hasAnyGroup } from "../../lib/permissions";
import { useToast } from "@chakra-ui/react";
import { Link } from "react-router-dom";

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

interface Props {
  className?: string;
}

export default function PendingDiscoveryFlights({ className }: Props) {
  const [flights, setFlights] = useState<DiscoveryFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const toast = useToast();

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

  const handleAssignFlight = async (flightId: string) => {
    try {
      const { error } = await supabase
        .from("discovery_flights")
        .update({ 
          pilot_id: user?.id,
          status: 'CONFIRMED'
        })
        .eq("id", flightId);

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
    }
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
                  onClick={() => handleAssignFlight(flight.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
                >
                  Devenir pilote
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
