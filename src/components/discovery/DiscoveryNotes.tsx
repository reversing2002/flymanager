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
  notes: DiscoveryNote[];
  expanded: boolean;
  onToggleExpand: () => void;
  onClose?: () => void;
}

export default function DiscoveryNotes({ flight, notes, expanded, onToggleExpand, onClose }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  if (!expanded) {
    return (
      <Box 
        onClick={onToggleExpand}
        cursor="pointer"
        p={2}
        borderRadius="md"
        _hover={{ bg: 'gray.50' }}
      >
        <HStack spacing={2}>
          <Text fontSize="sm" color="gray.600">
            {notes.length} note{notes.length > 1 ? 's' : ''}
          </Text>
          <Text fontSize="sm" color="gray.400">
            (Cliquer pour voir)
          </Text>
        </HStack>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={3}>
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text 
            fontSize="sm" 
            fontWeight="medium" 
            color="gray.700"
            onClick={onToggleExpand}
            cursor="pointer"
            _hover={{ color: 'gray.900' }}
          >
            {notes.length} note{notes.length > 1 ? 's' : ''}
          </Text>
        </HStack>
        <Divider />
      </Box>

      {notes.map((note) => (
        <Box
          key={note.id}
          p={3}
          borderRadius="md"
          bg={note.type === 'CLIENT_COMMUNICATION' ? 'green.50' : 'purple.50'}
        >
          <HStack justify="space-between" mb={1}>
            <HStack>
              <Text fontSize="sm" fontWeight="medium">
                {note.author?.first_name} {note.author?.last_name}
              </Text>
              <Badge
                colorScheme={note.type === 'CLIENT_COMMUNICATION' ? 'green' : 'purple'}
                variant="subtle"
              >
                {note.type === 'CLIENT_COMMUNICATION' ? 'Client' : 'Interne'}
              </Badge>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm')}
            </Text>
          </HStack>
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {note.content}
          </Text>
          {note.notification_settings && (
            <HStack mt={2} spacing={2}>
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
            </HStack>
          )}
        </Box>
      ))}
    </VStack>
  );
}
