import React, { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Textarea,
  Button,
  Checkbox,
  useToast,
  HStack,
  Badge,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { sendNotification } from '../../lib/notifications';
import type { DiscoveryFlight, DiscoveryNote } from '../../types/discovery';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CreateDiscoveryNoteModal from './CreateDiscoveryNoteModal';

interface Props {
  flight: DiscoveryFlight;
  onClose?: () => void;
}

export default function DiscoveryNotes({ flight, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'CLIENT' | 'INTERNAL'>('CLIENT');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ['discoveryNotes', flight.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovery_notes')
        .select(`
          *,
          author:author_id(
            id,
            first_name,
            last_name
          )
        `)
        .eq('flight_id', flight.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DiscoveryNote[];
    },
  });

  const filteredNotes = notes?.filter(note => 
    activeTab === 'CLIENT' 
      ? note.type === 'CLIENT_COMMUNICATION'
      : note.type === 'INTERNAL'
  );

  const handleSubmit = async (content: string, noteType: 'INTERNAL' | 'CLIENT_COMMUNICATION', sendEmail: boolean, sendSMS: boolean) => {
    try {
      // Créer la note dans la base de données
      const { data: note, error } = await supabase
        .from('discovery_notes')
        .insert({
          flight_id: flight.id,
          content,
          type: noteType,
          notification_settings: {
            send_email: sendEmail,
            send_sms: sendSMS,
            email_sent: false,
            sms_sent: false,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Envoyer les notifications si demandé
      if ((sendEmail || sendSMS) && noteType === 'CLIENT_COMMUNICATION') {
        await sendNotification(
          note,
          flight.contact_email,
          flight.contact_phone
        );

        // Mettre à jour le statut d'envoi
        await supabase
          .from('discovery_notes')
          .update({
            notification_settings: {
              ...note.notification_settings,
              email_sent: sendEmail,
              sms_sent: sendSMS,
              email_sent_at: sendEmail ? new Date().toISOString() : null,
              sms_sent_at: sendSMS ? new Date().toISOString() : null,
            },
          })
          .eq('id', note.id);
      }

      // Réinitialiser le formulaire
      queryClient.invalidateQueries(['discoveryNotes', flight.id]);

      toast({
        title: 'Note ajoutée avec succès',
        status: 'success',
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la note:', error);
      toast({
        title: 'Erreur lors de l\'ajout de la note',
        status: 'error',
      });
    }
  };

  return (
    <Box p={4}>
      <VStack spacing={4} align="stretch">
        <Box borderWidth={1} borderRadius="lg" overflow="hidden" bg="white">
          <Tabs
            isFitted
            variant="enclosed"
            colorScheme="blue"
            onChange={(index) => setActiveTab(index === 0 ? 'CLIENT' : 'INTERNAL')}
          >
            <TabList>
              <Tab
                _selected={{ 
                  color: 'blue.600',
                  borderColor: 'blue.600',
                  borderBottomColor: 'white',
                  bg: 'white'
                }}
                fontWeight="medium"
              >
                Communications Client
                {notes?.filter(n => n.type === 'CLIENT_COMMUNICATION').length > 0 && (
                  <Badge ml={2} colorScheme="blue" borderRadius="full">
                    {notes.filter(n => n.type === 'CLIENT_COMMUNICATION').length}
                  </Badge>
                )}
              </Tab>
              <Tab
                _selected={{ 
                  color: 'blue.600',
                  borderColor: 'blue.600',
                  borderBottomColor: 'white',
                  bg: 'white'
                }}
                fontWeight="medium"
              >
                Notes Internes
                {notes?.filter(n => n.type === 'INTERNAL').length > 0 && (
                  <Badge ml={2} colorScheme="blue" borderRadius="full">
                    {notes.filter(n => n.type === 'INTERNAL').length}
                  </Badge>
                )}
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" align="center">
                    <Text fontSize="lg" fontWeight="bold" color="gray.700">
                      Historique des communications
                    </Text>
                    <Button
                      colorScheme="blue"
                      size="sm"
                      onClick={() => setShowCreateModal(true)}
                      leftIcon={<span>+</span>}
                    >
                      Nouvelle communication
                    </Button>
                  </HStack>

                  {isLoadingNotes ? (
                    <VStack spacing={4} align="stretch">
                      {[1, 2].map((i) => (
                        <Box
                          key={i}
                          p={4}
                          borderWidth={1}
                          borderRadius="md"
                          bg="white"
                        >
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        </Box>
                      ))}
                    </VStack>
                  ) : filteredNotes?.length === 0 ? (
                    <Box
                      p={8}
                      textAlign="center"
                      color="gray.500"
                      bg="gray.50"
                      borderRadius="md"
                    >
                      <Text>Aucune communication pour le moment</Text>
                      <Button
                        mt={4}
                        colorScheme="blue"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateModal(true)}
                      >
                        Créer une première communication
                      </Button>
                    </Box>
                  ) : (
                    <VStack spacing={4} align="stretch" divider={<Divider />}>
                      {filteredNotes?.map((note) => (
                        <NoteCard key={note.id} note={note} />
                      ))}
                    </VStack>
                  )}
                </VStack>
              </TabPanel>

              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between" align="center">
                    <Text fontSize="lg" fontWeight="bold" color="gray.700">
                      Notes internes
                    </Text>
                    <Button
                      colorScheme="blue"
                      size="sm"
                      onClick={() => setShowCreateModal(true)}
                      leftIcon={<span>+</span>}
                    >
                      Nouvelle note
                    </Button>
                  </HStack>

                  {isLoadingNotes ? (
                    <VStack spacing={4} align="stretch">
                      {[1, 2].map((i) => (
                        <Box
                          key={i}
                          p={4}
                          borderWidth={1}
                          borderRadius="md"
                          bg="gray.50"
                        >
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        </Box>
                      ))}
                    </VStack>
                  ) : filteredNotes?.length === 0 ? (
                    <Box
                      p={8}
                      textAlign="center"
                      color="gray.500"
                      bg="gray.50"
                      borderRadius="md"
                    >
                      <Text>Aucune note interne pour le moment</Text>
                      <Button
                        mt={4}
                        colorScheme="blue"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateModal(true)}
                      >
                        Créer une première note
                      </Button>
                    </Box>
                  ) : (
                    <VStack spacing={4} align="stretch" divider={<Divider />}>
                      {filteredNotes?.map((note) => (
                        <NoteCard key={note.id} note={note} />
                      ))}
                    </VStack>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>

      {showCreateModal && (
        <CreateDiscoveryNoteModal
          flightId={flight.id}
          recipientEmail={flight.contact_email}
          recipientPhone={flight.contact_phone}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(content, noteType, sendEmail, sendSMS) => handleSubmit(content, noteType, sendEmail, sendSMS)}
          defaultType={activeTab === 'CLIENT' ? 'CLIENT_COMMUNICATION' : 'INTERNAL'}
        />
      )}
    </Box>
  );
}

function NoteCard({ note }: { note: DiscoveryNote }) {
  return (
    <Box
      p={4}
      borderWidth={1}
      borderRadius="md"
      position="relative"
      bg={note.type === 'INTERNAL' ? 'gray.50' : 'white'}
      transition="all 0.2s"
      _hover={{ borderColor: 'blue.200', shadow: 'sm' }}
    >
      <Text whiteSpace="pre-wrap">{note.content}</Text>
      <HStack mt={3} spacing={2} flexWrap="wrap">
        <Badge colorScheme="blue" fontSize="xs">
          {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', {
            locale: fr,
          })}
        </Badge>
        {note.author && (
          <Badge colorScheme="gray" fontSize="xs">
            {note.author.first_name} {note.author.last_name}
          </Badge>
        )}
        {note.type === 'CLIENT_COMMUNICATION' && note.notification_settings && (
          <>
            {note.notification_settings.email_sent && (
              <Badge colorScheme="green" variant="subtle" fontSize="xs">
                Email envoyé
              </Badge>
            )}
            {note.notification_settings.sms_sent && (
              <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                SMS envoyé
              </Badge>
            )}
          </>
        )}
      </HStack>
    </Box>
  );
}
