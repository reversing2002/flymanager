import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Users, Calendar, Scale, Phone, AlertTriangle, Plus } from 'lucide-react';
import { Button, useDisclosure } from '@chakra-ui/react';
import type { DiscoveryFlight } from '../../types/discovery';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import NewDiscoveryFlightModal from './NewDiscoveryFlightModal';
import ReservationModal from '../reservations/ReservationModal';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import { createReservation } from '../../lib/queries/reservations';

const DiscoveryFlightList = () => {
  const [selectedFlight, setSelectedFlight] = useState<DiscoveryFlight | null>(null);
  const [discoveryFlightTypeId] = useState<string>('77777777-3333-3333-3333-333333333333');
  const { isOpen: isNewFlightOpen, onOpen: onNewFlightOpen, onClose: onNewFlightClose } = useDisclosure();
  const { isOpen: isReservationOpen, onOpen: onReservationOpen, onClose: onReservationClose } = useDisclosure();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canAddFlight = hasAnyGroup(user, ['ADMIN', 'DISCOVERY_PILOT']);

  const { data: flights, isLoading, error } = useQuery({
    queryKey: ['discoveryFlights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovery_flights')
        .select(`
          *,
          pilot:users!discovery_flights_pilot_id_fkey(
            id,
            first_name,
            last_name
          ),
          aircraft:aircraft!discovery_flights_aircraft_id_fkey(
            id,
            registration,
            name
          )
        `)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erreur lors de la récupération des vols découverte:', error);
        throw error;
      }
      return data as DiscoveryFlight[];
    }
  });

  const { data: aircraft } = useQuery({
    queryKey: ['aircraft'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aircraft')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  const handleAssignClick = (flight: DiscoveryFlight) => {
    setSelectedFlight(flight);
    onReservationOpen();
  };

  const handleReservationClick = (flight: DiscoveryFlight) => {
    setSelectedFlight(flight);
    onReservationOpen();
  };

  const handleReservationSuccess = async (reservation: any) => {
    if (!selectedFlight || !user?.id) return;

    try {
      // Mettre à jour le vol découverte avec le pilote
      const { error: updateError } = await supabase
        .from('discovery_flights')
        .update({ 
          pilot_id: user.id,
          status: 'CONFIRMED'
        })
        .eq('id', selectedFlight.id);

      if (updateError) throw updateError;

      toast.success('Vol découverte assigné');
      onReservationClose();
      setSelectedFlight(null);
      // Rafraîchir la liste des vols découverte
      queryClient.invalidateQueries(['discoveryFlights']);
    } catch (error) {
      console.error('Erreur lors de l\'assignation du vol:', error);
      toast.error('Erreur lors de l\'assignation du vol');
    }
  };

  const formatClientComment = (flight: DiscoveryFlight) => {
    const phone = flight.contact_phone || 'Non renseigné';
    const email = flight.contact_email || 'Non renseigné';

    const comment = `Informations du client :
Téléphone : ${phone}
Email : ${email}
Nombre de passagers : ${flight.passenger_count}
Dates préférées : ${flight.preferred_dates}`;

    return comment;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="h-6 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <p>Une erreur est survenue lors du chargement des vols découverte</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canAddFlight && (
        <div className="flex justify-end">
          <Button
            leftIcon={<Plus className="h-5 w-5" />}
            colorScheme="blue"
            onClick={onNewFlightOpen}
          >
            Nouveau vol découverte
          </Button>
        </div>
      )}

      {flights?.map(flight => (
        <div 
          key={flight.id}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Vol découverte {flight.aircraft?.registration ? `- ${flight.aircraft.registration}` : ''}
                </h3>
                {flight.date && (
                  <p className="text-slate-600">
                    {format(new Date(flight.date), 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                )}
                {flight.start_time && flight.end_time && (
                  <p className="text-slate-600">
                    de {flight.start_time.substring(0, 5)} à {flight.end_time.substring(0, 5)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-5 w-5" />
                  <span>{flight.passenger_count} passager(s)</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Scale className="h-5 w-5" />
                  <span>Poids total: {flight.total_weight} kg</span>
                </div>

                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-5 w-5" />
                  <span>{flight.contact_phone}</span>
                </div>
              </div>

              {flight.contact_email && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Email:</span> {flight.contact_email}
                </div>
              )}

              {flight.comments && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Commentaires:</span> {flight.comments}
                </div>
              )}

              {flight.pilot && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="h-5 w-5" />
                  <span>
                    Pilote assigné : {flight.pilot.first_name} {flight.pilot.last_name}
                    {flight.pilot.id === user?.id && (
                      <Button
                        colorScheme="red"
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            if (!user?.id) {
                              toast.error('Vous devez être connecté pour effectuer cette action');
                              return;
                            }

                            // Mettre à jour le vol découverte en retirant le pilote
                            const { error: updateError } = await supabase
                              .from('discovery_flights')
                              .update({ pilot_id: null })
                              .eq('id', flight.id);

                            if (updateError) throw updateError;

                            toast.success('Vol découverte désassigné');
                            // Rafraîchir la liste des vols découverte
                            queryClient.invalidateQueries(['discoveryFlights']);
                          } catch (error) {
                            console.error('Erreur lors de la désassignation du vol:', error);
                            toast.error('Erreur lors de la désassignation du vol');
                          }
                        }}
                        ml={2}
                      >
                        Se désassigner
                      </Button>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div>
              <span className={`
                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                ${flight.status === 'REQUESTED' ? 'bg-purple-100 text-purple-800' :
                  flight.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                  flight.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                  flight.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'}
              `}>
                {flight.status === 'REQUESTED' ? 'Demande reçue' :
                 flight.status === 'PENDING' ? 'En attente' :
                 flight.status === 'CONFIRMED' ? 'Confirmé' :
                 flight.status === 'COMPLETED' ? 'Effectué' : 'Annulé'}
              </span>
            </div>
          </div>
          {canAddFlight && !flight.pilot_id && (
            <Button
              colorScheme="blue"
              size="sm"
              onClick={() => handleReservationClick(flight)}
              className="mt-4"
            >
              S'assigner ce vol
            </Button>
          )}
        </div>
      ))}

      {flights?.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Aucun vol découverte à venir</p>
        </div>
      )}

      {/* Modal de création d'un nouveau vol */}
      <NewDiscoveryFlightModal 
        isOpen={isNewFlightOpen} 
        onClose={onNewFlightClose} 
      />

      {selectedFlight && isReservationOpen && (
        <ReservationModal
          startTime={new Date()}
          endTime={new Date(new Date().setHours(new Date().getHours() + 1))}
          onClose={() => {
            setSelectedFlight(null);
            onReservationClose();
          }}
          onSuccess={() => {
            setSelectedFlight(null);
            onReservationClose();
            queryClient.invalidateQueries(['discoveryFlights']);
          }}
          aircraft={(aircraft || []).filter(a => a.capacity >= ((selectedFlight.passenger_count || 0) + 1))}
          users={users || []}
          preselectedAircraftId={selectedFlight.aircraft_id}
          preselectedFlightTypeId={discoveryFlightTypeId}
          comments={formatClientComment(selectedFlight)}
        />
      )}
    </div>
  );
};

export default DiscoveryFlightList;