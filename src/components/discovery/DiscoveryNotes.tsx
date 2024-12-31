import React, { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  HStack,
  Badge,
  Avatar,
  Input,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Lock, Clock, Send, MessageCircle, Trash2 } from 'lucide-react';
import type { DiscoveryFlight, DiscoveryNote } from '../../types/discovery';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  flight: DiscoveryFlight;
  notes: DiscoveryNote[];
}

export default function DiscoveryNotes({ flight, notes }: Props) {
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<DiscoveryNote | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !user?.id || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('discovery_notes')
        .insert({
          flight_id: flight.id,
          content: newNote.trim(),
          type: 'INTERNAL',
          author_id: user.id,
          notification_settings: {
            send_email: false,
            send_sms: false,
            email_sent: false,
            sms_sent: false
          }
        });

      if (error) throw error;

      setNewNote('');
      queryClient.invalidateQueries(['discoveryNotes']);
      toast({
        title: 'Note ajoutée',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la note:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter la note',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (note: DiscoveryNote) => {
    console.log('handleDelete called with note:', note);
    setNoteToDelete(note);
    setIsModalOpen(true);
    console.log('Setting modal to open');
  };

  const handleClose = () => {
    console.log('Closing modal');
    setIsModalOpen(false);
    setNoteToDelete(null);
  };

  const confirmDelete = async () => {
    console.log('confirmDelete called with noteToDelete:', noteToDelete);
    if (!noteToDelete) return;

    try {
      console.log('Attempting to delete note with ID:', noteToDelete.id);
      const { error, data } = await supabase
        .from('discovery_notes')
        .delete()
        .eq('id', noteToDelete.id)
        .eq('author_id', user?.id)
        .select();

      console.log('Delete response:', { error, data });

      if (error) throw error;

      queryClient.invalidateQueries(['discoveryNotes', flight.id]);
      toast({
        title: 'Note supprimée',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de la note:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la note',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      handleClose();
    }
  };

  console.log('Current modal state:', { isModalOpen, noteToDelete });

  if (notes.length === 0) {
    return null;
  }

  return (
    <>
      <Box pt={4}>
        <VStack align="stretch" spacing={4}>
          {notes.map((note) => (
            <Box
              key={note.id}
              display="flex"
              gap={3}
              alignItems="flex-start"
            >
              <Avatar 
                size="sm" 
                name={note.author?.first_name ? `${note.author.first_name} ${note.author.last_name}` : 'Utilisateur inconnu'} 
                bg={note.type === 'INTERNAL' ? 'purple.500' : 'blue.500'}
              />
              
              <Box flex={1}>
                <Box
                  bg={note.type === 'INTERNAL' ? 'gray.50' : 'blue.50'}
                  p={3}
                  borderRadius="lg"
                  position="relative"
                  _before={{
                    content: '""',
                    position: 'absolute',
                    left: '-8px',
                    top: '12px',
                    width: '0',
                    height: '0',
                    borderTop: '6px solid transparent',
                    borderBottom: '6px solid transparent',
                    borderRight: note.type === 'INTERNAL' 
                      ? '8px solid var(--chakra-colors-gray-50)' 
                      : '8px solid var(--chakra-colors-blue-50)',
                  }}
                >
                  <HStack spacing={2} mb={1}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      {note.author?.first_name && note.author?.last_name 
                        ? `${note.author.first_name} ${note.author.last_name}`
                        : 'Utilisateur inconnu'}
                    </Text>
                    {note.type === 'INTERNAL' && (
                      <Badge 
                        colorScheme="purple" 
                        display="flex" 
                        alignItems="center" 
                        gap={1}
                        size="sm"
                        px={2}
                        borderRadius="full"
                      >
                        <Lock size={10} />
                        <Text fontSize="xs">Privée</Text>
                      </Badge>
                    )}
                  </HStack>

                  <Text 
                    fontSize="sm" 
                    color="gray.700" 
                    whiteSpace="pre-wrap"
                  >
                    {note.content}
                  </Text>

                  <HStack spacing={2} mt={2} justifyContent="space-between" alignItems="center">
                    <HStack spacing={2}>
                      {note.notification_settings?.email_sent && (
                        <Badge colorScheme="green" variant="subtle" size="sm">
                          Email envoyé
                        </Badge>
                      )}
                      {note.notification_settings?.sms_sent && (
                        <Badge colorScheme="purple" variant="subtle" size="sm">
                          SMS envoyé
                        </Badge>
                      )}
                    </HStack>
                    
                    <HStack spacing={1} color="gray.500">
                      <Clock size={12} />
                      <Text fontSize="xs">
                        {format(new Date(note.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </Text>
                      {note.author_id === user?.id && (
                        <IconButton
                          aria-label="Supprimer la note"
                          icon={<Trash2 size={12} />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(note)}
                        />
                      )}
                    </HStack>
                  </HStack>
                </Box>
              </Box>
            </Box>
          ))}

          {/* Champ de saisie rapide */}
          <Box display="flex" gap={3} alignItems="flex-start" as="form" onSubmit={handleSubmit}>
            <Avatar 
              size="sm" 
              name={user?.user_metadata?.first_name 
                ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}` 
                : 'Vous'} 
              bg="purple.500"
            />
            
            <Box flex={1} position="relative">
              <Input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ajouter une note privée..."
                pr="40px"
                bg="white"
                borderRadius="full"
                size="sm"
                disabled={isSubmitting}
              />
              <IconButton
                type="submit"
                aria-label="Envoyer"
                icon={<Send size={16} />}
                size="sm"
                position="absolute"
                right="2px"
                top="2px"
                colorScheme="purple"
                variant="ghost"
                isLoading={isSubmitting}
                disabled={!newNote.trim() || isSubmitting}
                borderRadius="full"
              />
            </Box>
          </Box>
        </VStack>
      </Box>

      <AlertDialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 shadow-lg z-50 w-[90vw] max-w-md">
            <AlertDialog.Title className="text-lg font-semibold mb-4">
              Supprimer la note
            </AlertDialog.Title>
            <AlertDialog.Description className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette note ? Cette action est irréversible.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button 
                  className="px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={handleClose}
                >
                  Annuler
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button 
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                  onClick={confirmDelete}
                >
                  Supprimer
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
