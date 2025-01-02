import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from '@chakra-ui/react';
import { MessageSquare } from 'lucide-react';
import DiscoveryFlightChat from './DiscoveryFlightChat';

interface Message {
  id: string;
  body: string;
  author: string;
  timestamp: string;
}

interface DiscoveryFlightNotesProps {
  flightId: string;
  customerPhone: string;
}

const API_URL = import.meta.env.VITE_API_URL;

const DiscoveryFlightNotes: React.FC<DiscoveryFlightNotesProps> = ({
  flightId,
  customerPhone,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [lastMessage, setLastMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadLastMessage();
  }, [flightId]);

  const loadLastMessage = async () => {
    try {
      const response = await fetch(`${API_URL}/api/conversations/${flightId}/messages`);
      if (!response.ok) throw new Error('Erreur lors du chargement des messages');
      const messages: Message[] = await response.json();
      if (messages.length > 0) {
        setLastMessage(messages[messages.length - 1]);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Button
        leftIcon={<MessageSquare />}
        size="sm"
        variant="outline"
        onClick={onOpen}
        colorScheme={lastMessage ? 'blue' : 'gray'}
      >
        {lastMessage ? (
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.600">
              Dernier message ({formatTimestamp(lastMessage.timestamp)})
            </Text>
            <Text fontSize="sm" noOfLines={1}>
              {lastMessage.body}
            </Text>
          </VStack>
        ) : (
          'Voir les messages'
        )}
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent maxW="800px">
          <ModalHeader>Messages du vol découverte</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <DiscoveryFlightChat
              flightId={flightId}
              customerPhone={customerPhone}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DiscoveryFlightNotes;
