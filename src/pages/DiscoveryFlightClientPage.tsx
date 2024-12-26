import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { CalendarClock, MessageCircle, Users, FileText, CreditCard, ChevronRight } from 'lucide-react';
import { PassengerInfoForm } from '../components/discovery/PassengerInfoForm';
import ClientDiscoveryChat from '../components/discovery/ClientDiscoveryChat';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender: {
    first_name: string;
    last_name: string;
  };
}

interface DiscoveryFlight {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  pilot_id: string;
  aircraft_id: string;
  total_amount: number;
  invoice_url?: string;
  pilot?: {
    first_name: string;
    last_name: string;
  };
  aircraft?: {
    registration: string;
    name: string;
  };
}

const DiscoveryFlightClientPage: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const [activeTab, setActiveTab] = React.useState(0);
  const [newMessage, setNewMessage] = React.useState('');

  // Récupération des informations du vol
  const { data: flight, isLoading: isLoadingFlight } = useQuery({
    queryKey: ['discoveryFlight', flightId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovery_flights')
        .select('*, pilot:pilot_id(first_name, last_name), aircraft:aircraft_id(registration, name)')
        .eq('id', flightId)
        .single();

      if (error) throw error;
      return data as DiscoveryFlight;
    }
  });

  // Récupération des messages
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', flightId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovery_flight_messages')
        .select('*, sender:sender_id(first_name, last_name)')
        .eq('flight_id', flightId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Message[];
    }
  });

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('discovery_flight_messages')
        .insert([{
          flight_id: flightId,
          content: newMessage,
          sender_id: 'client' // À adapter selon votre système d'authentification
        }]);

      if (error) throw error;
      setNewMessage('');
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmé';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  if (isLoadingFlight || isLoadingMessages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête avec le statut */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Vol découverte
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {flight?.date && format(new Date(flight.date), 'EEEE d MMMM yyyy', { locale: fr })}
                  {flight?.start_time && ` - ${flight.start_time}`}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(flight?.status || '')}`}>
                {getStatusText(flight?.status || '')}
              </span>
            </div>

            {flight?.pilot && (
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <span className="mr-2">Pilote:</span>
                <span className="font-medium text-gray-900">
                  {flight.pilot.first_name} {flight.pilot.last_name}
                </span>
              </div>
            )}

            {flight?.aircraft && (
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="mr-2">Avion:</span>
                <span className="font-medium text-gray-900">
                  {flight.aircraft.registration} - {flight.aircraft.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white shadow rounded-lg">
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList className="border-b border-gray-200">
              <Tab className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none">
                <Users className="w-5 h-5 mr-2" />
                Passagers
              </Tab>
              <Tab className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none">
                <FileText className="w-5 h-5 mr-2" />
                Conditions
              </Tab>
              <Tab className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none">
                <CreditCard className="w-5 h-5 mr-2" />
                Paiement
              </Tab>
              <Tab className="px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none">
                <MessageCircle className="w-5 h-5 mr-2" />
                Messages
              </Tab>
            </TabList>

            <TabPanels>
              {/* Onglet Passagers */}
              <TabPanel>
                <div className="p-4">
                  <PassengerInfoForm />
                </div>
              </TabPanel>

              {/* Onglet Conditions */}
              <TabPanel>
                <div className="p-4">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Conditions du vol découverte
                  </h2>
                  
                  <div className="prose prose-blue max-w-none">
                    <h3>1. Conditions générales</h3>
                    <p>
                      Le vol découverte est soumis aux conditions météorologiques et peut être reporté
                      si les conditions ne sont pas favorables. Dans ce cas, une nouvelle date sera
                      proposée sans frais supplémentaires.
                    </p>

                    <h3>2. Sécurité</h3>
                    <p>
                      Les passagers doivent suivre les instructions du pilote à tout moment.
                      Le pilote est seul juge des conditions de vol et peut annuler ou reporter
                      le vol pour des raisons de sécurité.
                    </p>

                    <h3>3. Restrictions</h3>
                    <ul>
                      <li>Poids maximum par passager : 100 kg</li>
                      <li>Âge minimum : 7 ans</li>
                      <li>Les mineurs doivent être accompagnés d'un adulte</li>
                      <li>Les femmes enceintes ne sont pas autorisées à voler</li>
                    </ul>

                    <div className="mt-6 flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="conditions"
                          name="conditions"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="conditions" className="font-medium text-gray-700">
                          J'accepte les conditions du vol découverte
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>

              {/* Onglet Paiement */}
              <TabPanel>
                <div className="p-4">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Informations de paiement
                  </h2>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Montant total</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">
                          {flight?.total_amount}€
                        </dd>
                      </div>

                      <div>
                        <dt className="text-sm font-medium text-gray-500">Statut du paiement</dt>
                        <dd className="mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Payé
                          </span>
                        </dd>
                      </div>

                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Facture</dt>
                        <dd className="mt-1">
                          {flight?.invoice_url ? (
                            <a
                              href={flight.invoice_url}
                              className="inline-flex items-center text-blue-600 hover:text-blue-500"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Télécharger la facture
                              <ChevronRight className="w-5 h-5 ml-1" />
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500">
                              Facture non disponible
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </TabPanel>

              {/* Onglet Messages */}
              <TabPanel>
                <div className="p-4">
                  <ClientDiscoveryChat flightId={flightId!} />
                </div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DiscoveryFlightClientPage;
