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
  Tooltip,
  IconButton,
  SimpleGrid
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
import DiscoveryFlightChatModal from './DiscoveryFlightChatModal';
import HorizontalReservationCalendar from '../reservations/HorizontalReservationCalendar';

interface DiscoveryFlightListProps {
  viewMode?: 'list' | 'planning';
}

const DiscoveryFlightList: React.FC<DiscoveryFlightListProps> = ({ viewMode = 'list' }) => {
  const [selectedFlight, setSelectedFlight] = useState<DiscoveryFlight | null>(null);
  const [selectedChatFlight, setSelectedChatFlight] = useState<DiscoveryFlight | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [discoveryFlightTypeId] = useState<string>('77777777-3333-3333-3333-333333333333');
  const [selectedNoteType, setSelectedNoteType] = useState<'CLIENT_COMMUNICATION' | 'INTERNAL' | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({});
  const [quickNotes, setQuickNotes] = useState<{ [key: string]: string }>({});
  const { isOpen: isNewFlightOpen, onOpen: onNewFlightOpen, onClose: onNewFlightClose } = useDisclosure();
  const { isOpen: isReservationOpen, onOpen: onReservationOpen, onClose: onReservationClose } = useDisclosure();
  const { isOpen: isNotesOpen, onOpen: onNotesOpen, onClose: onNotesClose } = useDisclosure();
  const { isOpen: isChatOpen, onOpen: onChatOpen, onClose: onChatClose } = useDisclosure();
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

  const handleSubmit = async (content: string, type: 'CLIENT_COMMUNICATION' | 'INTERNAL', sendEmail: boolean, sendSMS: boolean) => {
    if (!selectedFlight || !user?.id) return;

    try {
      const { error } = await supabase
        .from('discovery_notes')
        .insert({
          flight_id: selectedFlight.id,
          content,
          type,
          author_id: user.id,
          notification_settings: {
            send_email: sendEmail,
            send_sms: sendSMS,
            email_sent: false,
            sms_sent: false
          }
        });

      if (error) throw error;

      // Rafraîchir les notes
      queryClient.invalidateQueries(['discoveryNotes']);
      toast.success('Note créée avec succès');
    } catch (err) {
      console.error('Erreur lors de la création de la note:', err);
      toast.error('Erreur lors de la création de la note');
    }
  };

  const handleChatClick = (flight: DiscoveryFlight) => {
    setSelectedChatFlight(flight);
    onChatOpen();
  };

  const handleCreateNote = (flight: DiscoveryFlight) => {
    setSelectedFlight(flight);
    setSelectedNoteType('INTERNAL');  // Forcer les notes en interne uniquement
    onNotesOpen();
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
    <div>
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

      {viewMode === 'list' ? (
        <div className="space-y-4">
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
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-transparent hover:border-blue-100"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <Text fontSize="lg" fontWeight="semibold">
                        {flight.contact_email}
                      </Text>
                      <Text color="gray.600">
                        {flight.contact_phone}
                      </Text>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tooltip label="Conversation client">
                        <IconButton
                          aria-label="Conversation client"
                          icon={<MessageCircle />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => handleChatClick(flight)}
                        />
                      </Tooltip>

                      <Tooltip label="Notes privées">
                        <IconButton
                          aria-label="Ajouter une note privée"
                          icon={<MessageSquare />}
                          size="sm"
                          colorScheme="gray"
                          variant="ghost"
                          onClick={() => handleCreateNote(flight)}
                        />
                      </Tooltip>

                      {canAddFlight && !flight.pilot_id && (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => handleAssignClick(flight)}
                        >
                          S'assigner
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{flight.passenger_count} passager(s)</span>
                    </div>
                    {flight.preferred_dates && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Préférence : {flight.preferred_dates}</span>
                      </div>
                    )}
                    {flight.pilot && (
                      <div className="flex items-center gap-1">
                        <span>Pilote : {flight.pilot.first_name} {flight.pilot.last_name}</span>
                      </div>
                    )}
                  </div>

                  {notesMap?.get(flight.id)?.length > 0 && (
                    <DiscoveryNotes
                      flight={flight}
                      notes={notesMap.get(flight.id) || []}
                      expanded={expandedNotes[flight.id]}
                      onToggleExpand={() => setExpandedNotes(prev => ({
                        ...prev,
                        [flight.id]: !prev[flight.id]
                      }))}
                    />
                  )}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="mt-4">
          <HorizontalReservationCalendar
            reservationType="discovery"
            showAddButton={false}
            onReservationClick={(reservation) => {
              const flight = flights?.find(f => f.id === reservation.id);
              if (flight) setSelectedFlight(flight);
            }}
          />
        </div>
      )}

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

      {/* Modal pour les notes privées */}
      {selectedFlight && isNotesOpen && (
        <CreateDiscoveryNoteModal
          flightId={selectedFlight.id}
          onClose={onNotesClose}
          onSuccess={(content) => {
            queryClient.invalidateQueries(['discoveryNotes']);
            onNotesClose();
          }}
          defaultType="INTERNAL"
        />
      )}

      {/* Modal pour le chat client */}
      {selectedChatFlight && isChatOpen && (
        <DiscoveryFlightChatModal
          flightId={selectedChatFlight.id}
          customerPhone={selectedChatFlight.contact_phone || ''}
          onClose={onChatClose}
        />
      )}
    </div>
  );
};

export default DiscoveryFlightList;