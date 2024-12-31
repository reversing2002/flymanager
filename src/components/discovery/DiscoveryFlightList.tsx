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
  Clock,
  List,
  UserCircle,
  CheckCircle,
  CheckCheck,
  ClipboardCheck,
  FileCheck,
  FileX,
  Lock
} from 'lucide-react';
import { 
  Button,
  useDisclosure,
  Text,
  Badge,
  Tooltip,
  IconButton,
  SimpleGrid,
  Box,
  HStack
} from '@chakra-ui/react';
import type { DiscoveryFlight } from '../../types/discovery';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import NewDiscoveryFlightModal from './NewDiscoveryFlightModal';
import ReservationModal from '../reservations/ReservationModal';
import { useAuth } from '../../contexts/AuthContext';
import { hasAnyGroup } from '../../lib/permissions';
import DiscoveryNotes from './DiscoveryNotes';
import DiscoveryFlightChatModal from './DiscoveryFlightChatModal';
import HorizontalReservationCalendar from '../reservations/HorizontalReservationCalendar';
import DiscoveryPrivateNotes from './DiscoveryPrivateNotes';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Plane } from 'lucide-react';

interface DiscoveryFlightListProps {
  viewMode?: 'list' | 'planning';
}

const DiscoveryFlightList: React.FC<DiscoveryFlightListProps> = ({ viewMode = 'list' }) => {
  const [selectedFlight, setSelectedFlight] = useState<DiscoveryFlight | null>(null);
  const [selectedChatFlight, setSelectedChatFlight] = useState<DiscoveryFlight | null>(null);
  const [passengerInfoModal, setPassengerInfoModal] = useState(false);
  const [selectedPassengerInfo, setSelectedPassengerInfo] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMyFlights, setShowMyFlights] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [discoveryFlightTypeId] = useState<string>('77777777-3333-3333-3333-333333333333');
  const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({});
  const { isOpen: isNewFlightOpen, onOpen: onNewFlightOpen, onClose: onNewFlightClose } = useDisclosure();
  const { isOpen: isReservationOpen, onOpen: onReservationOpen, onClose: onReservationClose } = useDisclosure();
  const { isOpen: isChatOpen, onOpen: onChatOpen, onClose: onChatClose } = useDisclosure();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canAddFlight = hasAnyGroup(user, ['ADMIN', 'DISCOVERY_PILOT']);
  const containerRef = React.useRef<HTMLDivElement>(null);

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
      // D'abord, récupérer toutes les notes
      const { data: notes, error: notesError } = await supabase
        .from('discovery_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      // Récupérer les auteurs uniques
      const authorIds = [...new Set(notes.filter(note => note.author_id).map(note => note.author_id))];
      
      // Récupérer les informations des auteurs si nécessaire
      let authors = [];
      if (authorIds.length > 0) {
        const { data: authorsData, error: authorsError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', authorIds);

        if (authorsError) throw authorsError;
        authors = authorsData || [];
      }

      // Créer un map des auteurs pour un accès rapide
      const authorsMap = new Map(authors.map(author => [author.id, author]));

      // Organiser les notes par vol avec les informations d'auteur
      const map = new Map();
      notes.forEach(note => {
        const noteWithAuthor = {
          ...note,
          author: note.author_id ? authorsMap.get(note.author_id) : null
        };
        if (!map.has(note.flight_id)) {
          map.set(note.flight_id, []);
        }
        map.get(note.flight_id).push(noteWithAuthor);
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

  const handleChatClick = (flight: DiscoveryFlight) => {
    setSelectedChatFlight(flight);
    onChatOpen();
  };

  const fetchPassengerInfo = async (flightId: string) => {
    try {
      const { data, error } = await supabase
        .from('passenger_info')
        .select('passenger_data')
        .eq('flight_id', flightId)
        .single();

      if (error) {
        console.error('Erreur lors de la récupération des informations passagers:', error);
        toast.error('Impossible de récupérer les informations des passagers');
        return;
      }

      setSelectedPassengerInfo(data?.passenger_data);
      setPassengerInfoModal(true);
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Une erreur est survenue');
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
    <div ref={containerRef} className="h-full overflow-hidden flex flex-col">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Rechercher par email, téléphone..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 placeholder-gray-400 transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
            {canAddFlight && (
              <Button
                leftIcon={<Plus className="h-5 w-5" />}
                colorScheme="blue"
                size="lg"
                onClick={onNewFlightOpen}
                className="w-full sm:w-auto shadow-sm hover:shadow-md transition-all duration-200"
              >
                Nouveau vol découverte
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 flex-grow">
              <Button
                size="md"
                variant={statusFilter === 'all' ? 'solid' : 'ghost'}
                colorScheme="blue"
                onClick={() => setStatusFilter('all')}
                className={`whitespace-nowrap flex items-center gap-2 px-6 ${
                  statusFilter === 'all' 
                    ? 'shadow-md bg-blue-500 text-white hover:bg-blue-600' 
                    : 'hover:bg-blue-50'
                }`}
                leftIcon={<List className={`h-4 w-4 ${statusFilter === 'all' ? 'text-white' : 'text-blue-500'}`} />}
              >
                Tous les vols
              </Button>
              <Button
                size="md"
                variant={statusFilter === 'REQUESTED' ? 'solid' : 'ghost'}
                colorScheme="purple"
                onClick={() => setStatusFilter('REQUESTED')}
                className={`whitespace-nowrap flex items-center gap-2 px-6 ${
                  statusFilter === 'REQUESTED' 
                    ? 'shadow-md bg-purple-500 text-white hover:bg-purple-600' 
                    : 'hover:bg-purple-50'
                }`}
                leftIcon={<Clock className={`h-4 w-4 ${statusFilter === 'REQUESTED' ? 'text-white' : 'text-purple-500'}`} />}
              >
                <Badge 
                  colorScheme="purple" 
                  variant="solid"
                  className={`ml-2 px-2.5 py-1 rounded-full font-semibold ${
                    statusFilter === 'REQUESTED' 
                      ? 'bg-white text-purple-500' 
                      : 'bg-purple-500 text-white'
                  }`}
                >
                  {flights?.filter(f => f.status === 'REQUESTED').length || 0}
                </Badge>
                Demandes reçues
              </Button>
              <Button
                size="md"
                variant={statusFilter === 'CONFIRMED' ? 'solid' : 'ghost'}
                colorScheme="green"
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`whitespace-nowrap flex items-center gap-2 px-6 ${
                  statusFilter === 'CONFIRMED' 
                    ? 'shadow-md bg-green-500 text-white hover:bg-green-600' 
                    : 'hover:bg-green-50'
                }`}
                leftIcon={<CheckCircle className={`h-4 w-4 ${statusFilter === 'CONFIRMED' ? 'text-white' : 'text-green-500'}`} />}
              >
                <Badge 
                  colorScheme="green" 
                  variant="solid"
                  className={`ml-2 px-2.5 py-1 rounded-full font-semibold ${
                    statusFilter === 'CONFIRMED' 
                      ? 'bg-white text-green-500' 
                      : 'bg-green-500 text-white'
                  }`}
                >
                  {flights?.filter(f => f.status === 'CONFIRMED').length || 0}
                </Badge>
                Confirmés
              </Button>
              <Button
                size="md"
                variant={statusFilter === 'COMPLETED' ? 'solid' : 'ghost'}
                colorScheme="blue"
                onClick={() => setStatusFilter('COMPLETED')}
                className={`whitespace-nowrap flex items-center gap-2 px-6 ${
                  statusFilter === 'COMPLETED' 
                    ? 'shadow-md bg-blue-500 text-white hover:bg-blue-600' 
                    : 'hover:bg-blue-50'
                }`}
                leftIcon={<CheckCheck className={`h-4 w-4 ${statusFilter === 'COMPLETED' ? 'text-white' : 'text-blue-500'}`} />}
              >
                <Badge 
                  colorScheme="blue" 
                  variant="solid"
                  className={`ml-2 px-2.5 py-1 rounded-full font-semibold ${
                    statusFilter === 'COMPLETED' 
                      ? 'bg-white text-blue-500' 
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {flights?.filter(f => f.status === 'COMPLETED').length || 0}
                </Badge>
                Effectués
              </Button>
            </div>
            
            {hasAnyGroup(user, ['DISCOVERY_PILOT']) && (
              <Button
                size="md"
                variant={showMyFlights ? 'solid' : 'ghost'}
                colorScheme="orange"
                onClick={() => setShowMyFlights(!showMyFlights)}
                className={`whitespace-nowrap flex items-center gap-2 min-w-[200px] px-6 ${
                  showMyFlights 
                    ? 'shadow-md bg-orange-500 text-white hover:bg-orange-600' 
                    : 'hover:bg-orange-50'
                }`}
                leftIcon={<UserCircle className={`h-4 w-4 ${showMyFlights ? 'text-white' : 'text-orange-500'}`} />}
              >
                <Badge 
                  colorScheme="orange" 
                  variant="solid"
                  className={`ml-2 px-2.5 py-1 rounded-full font-semibold ${
                    showMyFlights 
                      ? 'bg-white text-orange-500' 
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {flights?.filter(f => f.pilot_id === user?.id).length || 0}
                </Badge>
                Mes vols
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {viewMode === 'list' ? (
        <AnimatePresence>
          <div className="space-y-4">
            {flights
              ?.filter(flight => {
                const statusMatch = statusFilter === 'all' || flight.status === statusFilter;
                const searchMatch = searchTerm === '' || 
                  flight.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  flight.contact_phone?.includes(searchTerm);
                const pilotMatch = !showMyFlights || flight.pilot_id === user?.id;
                return statusMatch && searchMatch && pilotMatch;
              })
              .map((flight, index) => (
                <motion.div
                  key={flight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-6 border ${
                    flight.pilot_id === user?.id ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div>
                            <Text fontSize="lg" fontWeight="semibold" className="truncate">
                              {flight.contact_email}
                            </Text>
                            <Text color="gray.600" className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              {flight.contact_phone}
                            </Text>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
                        <HStack spacing={2} mt={2}>
                          <Tooltip label="Vérifier les informations passagers">
                            <IconButton
                              aria-label="Vérifier les informations passagers"
                              icon={<ClipboardCheck className="h-5 w-5" />}
                              size="md"
                              colorScheme="green"
                              variant="ghost"
                              onClick={() => fetchPassengerInfo(flight.id)}
                              className="hover:bg-green-50"
                            />
                          </Tooltip>

                          <Tooltip label="Conversation client">
                            <IconButton
                              aria-label="Conversation client"
                              icon={<MessageCircle className="h-5 w-5" />}
                              size="md"
                              colorScheme="blue"
                              variant="ghost"
                              onClick={() => handleChatClick(flight)}
                              className="hover:bg-blue-50"
                            />
                          </Tooltip>

                          {canAddFlight && (
                            <Button
                              size="md"
                              colorScheme="blue"
                              onClick={() => handleAssignClick(flight)}
                              leftIcon={<UserPlus className="h-5 w-5" />}
                              className="shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              S'assigner
                            </Button>
                          )}
                        </HStack>
                        <HStack spacing={2} mt={2}>
                          <Tooltip label="Notes privées">
                            <IconButton
                              aria-label="Voir les notes privées"
                              icon={<Lock size={18} />}
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                // setShowPrivateNotes(showPrivateNotes === flight.id ? null : flight.id);
                              }}
                            />
                          </Tooltip>
                        </HStack>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2 bg-gray-50/80 p-3 rounded-lg">
                        <Users className="h-5 w-5 text-gray-500" />
                        <span>{flight.passenger_count} passager(s)</span>
                      </div>
                      {flight.preferred_dates && (
                        <div className="flex items-center gap-2 bg-gray-50/80 p-3 rounded-lg">
                          <Calendar className="h-5 w-5 text-gray-500" />
                          <span className="truncate">Préférence : {flight.preferred_dates}</span>
                        </div>
                      )}
                      {flight.pilot && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${
                          flight.pilot_id === user?.id ? 'bg-orange-100/50' : 'bg-gray-50/80'
                        }`}>
                          <Plane className={`h-5 w-5 ${
                            flight.pilot_id === user?.id ? 'text-orange-500' : 'text-gray-500'
                          }`} />
                          <span className="truncate">
                            Pilote : {flight.pilot.first_name} {flight.pilot.last_name}
                            {flight.pilot_id === user?.id && " (Vous)"}
                          </span>
                        </div>
                      )}
                      <div className={`flex items-center gap-2 p-3 rounded-lg ${
                        getStatusColor(flight.status).bgColor
                      }`}>
                        {getStatusIcon(flight.status)}
                        <span className="truncate font-medium">
                          {getStatusLabel(flight.status)}
                        </span>
                      </div>
                    </div>

                    <Box mt={3}>
                      <DiscoveryNotes
                        flight={flight}
                        notes={notesMap?.get(flight.id) || []}
                      />
                    </Box>
                  </div>
                </motion.div>
              ))}
          </div>
        </AnimatePresence>
      ) : (
        <div className="mt-4 bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <Text fontSize="lg" color="gray.600">Aucun vol découverte à venir</Text>
        </motion.div>
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

      {/* Modal pour le chat client */}
      {selectedChatFlight && isChatOpen && (
        <DiscoveryFlightChatModal
          flightId={selectedChatFlight.id}
          customerPhone={selectedChatFlight.contact_phone || ''}
          onClose={onChatClose}
        />
      )}

      {/* Modal des informations passagers */}
      {passengerInfoModal && selectedPassengerInfo && (
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
                {selectedPassengerInfo.passengers.map((passenger: any, index: number) => (
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
                        {passenger.contactsUrgence.map((contact: any, contactIndex: number) => (
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
                                <p className="font-medium">{contact.nom}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Téléphone</p>
                                <p className="font-medium">{contact.telephone}</p>
                              </div>
                              <div className="sm:col-span-2">
                                <p className="text-sm text-gray-500">Adresse</p>
                                <p className="font-medium">{contact.adresse}</p>
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
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'REQUESTED':
      return { bgColor: 'bg-purple-50', textColor: 'text-purple-600' };
    case 'CONFIRMED':
      return { bgColor: 'bg-green-50', textColor: 'text-green-600' };
    case 'COMPLETED':
      return { bgColor: 'bg-blue-50', textColor: 'text-blue-600' };
    default:
      return { bgColor: 'bg-gray-50', textColor: 'text-gray-600' };
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'REQUESTED':
      return 'Demande reçue';
    case 'CONFIRMED':
      return 'Confirmé';
    case 'COMPLETED':
      return 'Effectué';
    default:
      return status;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'REQUESTED':
      return <Clock className="h-5 w-5 text-purple-500" />;
    case 'CONFIRMED':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'COMPLETED':
      return <CheckCheck className="h-5 w-5 text-blue-500" />;
    default:
      return null;
  }
};

export default DiscoveryFlightList;