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
import { FileCheck, FileX } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserCircle } from 'lucide-react';

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

interface PassengerData {
  nom: string;
  prenom: string;
  dateNaissance: string;
  age: number;
  poids: number;
  contactsUrgence: Array<{
    nom: string;
    adresse: string;
    telephone: string;
  }>;
  autorisationParentale1?: string;
  autorisationParentale2?: string;
  parent1Nom?: string;
  parent1Prenom?: string;
  parent2Nom?: string;
  parent2Prenom?: string;
}

interface PassengerInfo {
  passengers: PassengerData[];
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
  const [passengerInfoModal, setPassengerInfoModal] = useState(false);
  const [selectedPassengerInfo, setSelectedPassengerInfo] = useState<PassengerInfo | null>(null);
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

  const fetchPassengerInfo = async (flightId: string) => {
    const { data, error } = await supabase
      .from('passenger_info')
      .select('passenger_data')
      .eq('flight_id', flightId)
      .single();

    if (error) {
      console.error('Erreur lors de la récupération des informations passagers:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les informations des passagers',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setSelectedPassengerInfo(data?.passenger_data);
    setPassengerInfoModal(true);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flights.map((flight) => (
            <div key={flight.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <CalendarClock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Vol découverte</h3>
                  {flight.date && (
                    <p className="text-sm text-gray-600">
                      {format(new Date(flight.date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-6 h-6 flex items-center justify-center mr-2">
                    <span className="text-gray-500">👥</span>
                  </div>
                  <p className="text-sm">{flight.passenger_count} passager(s)</p>
                </div>
                
                <div className="flex items-center">
                  <div className="w-6 h-6 flex items-center justify-center mr-2">
                    <span className="text-gray-500">✉️</span>
                  </div>
                  <p className="text-sm">{flight.contact_email}</p>
                </div>
                
                <div className="flex items-center">
                  <div className="w-6 h-6 flex items-center justify-center mr-2">
                    <span className="text-gray-500">📱</span>
                  </div>
                  <p className="text-sm">{flight.contact_phone}</p>
                </div>

                <div className="flex items-center">
                  <div className="w-6 h-6 flex items-center justify-center mr-2">
                    <span className="text-gray-500">🗓️</span>
                  </div>
                  <p className="text-sm">Préférence : {flight.preferred_dates}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={() => fetchPassengerInfo(flight.id)}
                  className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-blue-600">👥</span>
                  Vérifier les informations passagers
                </button>
                
                <button
                  onClick={() => handleAssignFlight(flight)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
      {passengerInfoModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-y-auto"
        >
          <div className="min-h-screen px-4 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm"
              onClick={() => setPassengerInfoModal(false)}
            />
            
            <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle bg-white shadow-xl rounded-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Informations des Passagers
                </h3>
                <button
                  onClick={() => setPassengerInfoModal(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">Fermer</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {selectedPassengerInfo?.passengers.map((passenger, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gray-50 p-4 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-medium text-gray-900">
                          {passenger.prenom} {passenger.nom}
                        </h4>
                        <p className="text-sm text-gray-500">Passager {index + 1}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-500">Âge</p>
                        <p className="font-medium">{passenger.age} ans</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-500">Poids</p>
                        <p className="font-medium">{passenger.poids} kg</p>
                      </div>
                    </div>

                    {passenger.age < 18 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Autorisations Parentales
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-500">Parent 1</span>
                              {passenger.autorisationParentale1 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <FileCheck className="w-4 h-4 mr-1" />
                                  Signé
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <FileX className="w-4 h-4 mr-1" />
                                  Non signé
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium">
                              {passenger.parent1Prenom} {passenger.parent1Nom}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-500">Parent 2</span>
                              {passenger.autorisationParentale2 ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <FileCheck className="w-4 h-4 mr-1" />
                                  Signé
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <FileX className="w-4 h-4 mr-1" />
                                  Non signé
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium">
                              {passenger.parent2Prenom} {passenger.parent2Nom}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-3">
                        Contacts d'urgence
                      </h5>
                      <div className="space-y-3">
                        {passenger.contactsUrgence.map((contact, contactIndex) => (
                          <motion.div
                            key={contactIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: contactIndex * 0.1 }}
                            className="bg-white p-3 rounded-lg border border-gray-100"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <p className="text-sm text-gray-500">Nom</p>
                                <p className="text-sm font-medium">{contact.nom}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Téléphone</p>
                                <p className="text-sm font-medium">{contact.telephone}</p>
                              </div>
                              <div className="sm:col-span-2">
                                <p className="text-sm text-gray-500">Adresse</p>
                                <p className="text-sm font-medium">{contact.adresse}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
