import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Users, 
  Calendar, 
  Scale, 
  Phone, 
  AlertTriangle, 
  Plus, 
  MessageSquare,
  Mail,
  MessageCircle,
  Clock
} from 'lucide-react';
import { 
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Text,
  Badge,
  Tooltip
} from '@chakra-ui/react';
import type { DiscoveryFlight } from '../../types/discovery';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import NewDiscoveryFlightModal from './NewDiscoveryFlightModal';
import ReservationModal from '../reservations/ReservationModal';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import CreateDiscoveryNoteModal from './CreateDiscoveryNoteModal';
import DiscoveryNotes from './DiscoveryNotes';

const DiscoveryFlightList = () => {
  const [selectedFlight, setSelectedFlight] = useState<DiscoveryFlight | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [discoveryFlightTypeId] = useState<string>('77777777-3333-3333-3333-333333333333');
  const [selectedNoteType, setSelectedNoteType] = useState<'CLIENT_COMMUNICATION' | 'INTERNAL' | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({});
  const [quickNotes, setQuickNotes] = useState<{ [key: string]: string }>({});
  const { isOpen: isNewFlightOpen, onOpen: onNewFlightOpen, onClose: onNewFlightClose } = useDisclosure();
  const { isOpen: isReservationOpen, onOpen: onReservationOpen, onClose: onReservationClose } = useDisclosure();
  const { isOpen: isNotesOpen, onOpen: onNotesOpen, onClose: onNotesClose } = useDisclosure();
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

  // Charger les notes pour chaque vol
  const { data: notesMap } = useQuery({
    queryKey: ['discoveryNotes'],
    queryFn: async () => {
      const { data: notes, error: notesError } = await supabase
        .from('discovery_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      // Récupérer les auteurs
      const authorIds = [...new Set(notes.map(note => note.author_id))];
      const { data: authors, error: authorsError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', authorIds);

      if (authorsError) throw authorsError;

      // Créer un map des auteurs pour un accès rapide
      const authorsMap = new Map(authors.map(author => [author.id, author]));

      // Organiser les notes par vol avec les informations d'auteur
      const map = new Map();
      notes.forEach(note => {
        if (!map.has(note.flight_id)) {
          map.set(note.flight_id, []);
        }
        map.get(note.flight_id).push({
          ...note,
          author: authorsMap.get(note.author_id)
        });
      });
      return map;
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

  // Fonction pour gérer l'ajout rapide de note
  const handleQuickNoteSubmit = async (flightId: string, type: 'CLIENT_COMMUNICATION' | 'INTERNAL') => {
    if (!quickNotes[flightId]?.trim() || !user?.id) return;

    try {
      const { data: note, error } = await supabase
        .from('discovery_notes')
        .insert({
          flight_id: flightId,
          content: quickNotes[flightId].trim(),
          type,
          author_id: user.id,
          notification_settings: {
            email_sent: false,
            sms_sent: false
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Réinitialiser le champ de note rapide
      setQuickNotes(prev => ({
        ...prev,
        [flightId]: ''
      }));

      // Rafraîchir les notes
      queryClient.invalidateQueries(['discoveryNotes']);
      toast.success('Note ajoutée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la note:', error);
      toast.error('Erreur lors de l\'ajout de la note');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse"></div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="space-y-4 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-4 bg-slate-100 rounded"></div>
                <div className="h-4 bg-slate-100 rounded"></div>
              </div>
              <div className="h-10 bg-slate-100 rounded w-1/4"></div>
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
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex-grow space-y-4 w-full md:w-auto">
            <input
              type="text"
              placeholder="Rechercher par email, téléphone..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                colorScheme={statusFilter === 'all' ? 'blue' : 'gray'}
                onClick={() => setStatusFilter('all')}
              >
                Tous
              </Button>
              <Button
                size="sm"
                colorScheme={statusFilter === 'REQUESTED' ? 'purple' : 'gray'}
                onClick={() => setStatusFilter('REQUESTED')}
              >
                Demandes reçues
              </Button>
              <Button
                size="sm"
                colorScheme={statusFilter === 'CONFIRMED' ? 'green' : 'gray'}
                onClick={() => setStatusFilter('CONFIRMED')}
              >
                Confirmés
              </Button>
              <Button
                size="sm"
                colorScheme={statusFilter === 'COMPLETED' ? 'blue' : 'gray'}
                onClick={() => setStatusFilter('COMPLETED')}
              >
                Effectués
              </Button>
            </div>
          </div>
          {canAddFlight && (
            <Button
              leftIcon={<Plus className="h-5 w-5" />}
              colorScheme="blue"
              onClick={onNewFlightOpen}
              className="w-full md:w-auto"
            >
              Nouveau vol découverte
            </Button>
          )}
        </div>
      </div>

      {flights
        ?.filter(flight => 
          (statusFilter === 'all' || flight.status === statusFilter) &&
          (searchTerm === '' || 
            flight.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            flight.contact_phone?.includes(searchTerm))
        )
        .map(flight => (
          <div 
            key={flight.id}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-transparent hover:border-blue-100"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-4 flex-grow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      Vol découverte {flight.aircraft?.registration ? `- ${flight.aircraft.registration}` : ''}
                      <Badge
                        colorScheme={
                          flight.status === 'REQUESTED' ? 'purple' :
                          flight.status === 'PENDING' ? 'orange' :
                          flight.status === 'CONFIRMED' ? 'green' :
                          flight.status === 'COMPLETED' ? 'blue' : 'red'
                        }
                        className="ml-2"
                      >
                        {flight.status === 'REQUESTED' ? 'Demande reçue' :
                         flight.status === 'PENDING' ? 'En attente' :
                         flight.status === 'CONFIRMED' ? 'Confirmé' :
                         flight.status === 'COMPLETED' ? 'Effectué' : 'Annulé'}
                      </Badge>
                    </h3>

                    {flight.date && (
                      <p className="text-slate-600 flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(flight.date), 'EEEE d MMMM yyyy', { locale: fr })}
                        {flight.start_time && flight.end_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {flight.start_time.substring(0, 5)} - {flight.end_time.substring(0, 5)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {canAddFlight && !flight.pilot_id && (
                      <Button
                        colorScheme="blue"
                        size="sm"
                        onClick={() => handleAssignClick(flight)}
                      >
                        S'assigner ce vol
                      </Button>
                    )}
                    {flight.pilot?.id === user?.id && (
                      <Button
                        colorScheme="red"
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            if (!user?.id) return;
                            const { error: updateError } = await supabase
                              .from('discovery_flights')
                              .update({ pilot_id: null })
                              .eq('id', flight.id);

                            if (updateError) throw updateError;
                            toast.success('Vol découverte désassigné');
                            queryClient.invalidateQueries(['discoveryFlights']);
                          } catch (error) {
                            console.error('Erreur lors de la désassignation:', error);
                            toast.error('Erreur lors de la désassignation');
                          }
                        }}
                      >
                        Se désassigner
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Tooltip label="Nombre de passagers">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-3 rounded-lg">
                      <Users className="h-5 w-5" />
                      <span>{flight.passenger_count} passager(s)</span>
                    </div>
                  </Tooltip>

                  <Tooltip label="Poids total">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-3 rounded-lg">
                      <Scale className="h-5 w-5" />
                      <span>{flight.total_weight} kg</span>
                    </div>
                  </Tooltip>

                  <Tooltip label={flight.contact_email}>
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-3 rounded-lg cursor-help">
                      <Mail className="h-5 w-5" />
                      <span className="truncate">{flight.contact_email}</span>
                    </div>
                  </Tooltip>

                  <Tooltip label={flight.contact_phone}>
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-50 p-3 rounded-lg">
                      <Phone className="h-5 w-5" />
                      <span>{flight.contact_phone}</span>
                    </div>
                  </Tooltip>
                </div>

                {flight.pilot && (
                  <div className="flex items-center gap-2 text-slate-600 mt-2 bg-blue-50 p-2 rounded-lg">
                    <Users className="h-5 w-5" />
                    <span>
                      Pilote : {flight.pilot.first_name} {flight.pilot.last_name}
                    </span>
                  </div>
                )}

                {/* Section des notes */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <MessageCircle className="h-5 w-5" />
                      <h4 className="font-medium">
                        Notes et communications {notesMap?.get(flight.id)?.length > 0 && `(${notesMap.get(flight.id).length})`}
                      </h4>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="green"
                        leftIcon={<MessageSquare className="h-4 w-4" />}
                        onClick={() => {
                          setSelectedFlight(flight);
                          setSelectedNoteType('CLIENT_COMMUNICATION');
                          onNotesOpen();
                        }}
                      >
                        Communication client
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="purple"
                        leftIcon={<MessageCircle className="h-4 w-4" />}
                        onClick={() => {
                          setSelectedFlight(flight);
                          setSelectedNoteType('INTERNAL');
                          onNotesOpen();
                        }}
                      >
                        Note interne
                      </Button>
                    </div>
                  </div>

                  {notesMap?.get(flight.id)?.length > 0 ? (
                    <div className="space-y-3">
                      {notesMap.get(flight.id).map((note: any) => (
                        <div 
                          key={note.id} 
                          className={`rounded-lg p-3 text-sm transition-colors duration-200 hover:bg-opacity-80 ${
                            note.type === 'CLIENT_COMMUNICATION' ? 'bg-green-50' : 'bg-purple-50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-slate-600 mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {note.author?.first_name} {note.author?.last_name}
                              </span>
                              <Badge 
                                colorScheme={note.type === 'CLIENT_COMMUNICATION' ? 'green' : 'purple'}
                                variant="subtle"
                              >
                                {note.type === 'CLIENT_COMMUNICATION' ? 'Client' : 'Interne'}
                              </Badge>
                            </div>
                            <span className="text-xs">
                              {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-wrap">{note.content}</p>
                          {note.notification_settings && (
                            <div className="flex gap-2 mt-2">
                              {note.notification_settings.email_sent && (
                                <Badge colorScheme="green" variant="subtle" size="sm">
                                  Email envoyé
                                </Badge>
                              )}
                              {note.notification_settings.sms_sent && (
                                <Badge colorScheme="purple" variant="subtle" size="sm">
                                  SMS envoyé
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 rounded-lg">
                      <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600 text-sm">Aucune note pour le moment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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

      {/* Modal pour les notes */}
      <Modal isOpen={isNotesOpen} onClose={() => {
        onNotesClose();
        setSelectedNoteType(null);
      }} size="xl">
        <ModalOverlay />
        <ModalContent maxW="800px">
          <ModalHeader>
            {selectedNoteType === 'CLIENT_COMMUNICATION' ? 'Nouvelle communication client' : 'Nouvelle note interne'}
            {selectedFlight && (
              <Text fontSize="sm" color="gray.600" mt={1}>
                Vol découverte - {selectedFlight.contact_email} / {selectedFlight.contact_phone}
              </Text>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedFlight && (
              <CreateDiscoveryNoteModal 
                flightId={selectedFlight.id}
                recipientEmail={selectedFlight.contact_email}
                recipientPhone={selectedFlight.contact_phone}
                onClose={() => {
                  onNotesClose();
                  setSelectedNoteType(null);
                }}
                onSuccess={(content, noteType, sendEmail, sendSMS) => {
                  handleSubmit(content, noteType, sendEmail, sendSMS);
                  onNotesClose();
                  setSelectedNoteType(null);
                }}
                defaultType={selectedNoteType || 'INTERNAL'}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default DiscoveryFlightList;