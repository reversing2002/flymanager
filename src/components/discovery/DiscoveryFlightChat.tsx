import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  useToast,
  Flex,
  Avatar,
  IconButton,
  Spinner,
} from '@chakra-ui/react';
import { Send, RefreshCw } from 'lucide-react';

interface Message {
  sid: string;
  body: string;
  author: string;
  dateCreated: string;
}

interface ConversationResponse {
  conversation: {
    sid: string;
    friendlyName: string;
    messages: Message[];
  };
}

interface DiscoveryFlightChatProps {
  flightId: string;
  customerPhone: string;
}

const DiscoveryFlightChat: React.FC<DiscoveryFlightChatProps> = ({
  flightId,
  customerPhone,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadMessages();
    // Mettre en place un polling toutes les 10 secondes pour les nouveaux messages
    const interval = setInterval(loadMessages, 10000);
    return () => clearInterval(interval);
  }, [flightId]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/conversations/${flightId}/messages`);
      if (!response.ok) throw new Error('Erreur lors du chargement des messages');
      const data: ConversationResponse = await response.json();
      setMessages(data.conversation.messages);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les messages',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/conversations/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightId,
          message: newMessage,
          sender: 'client',
        }),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'envoi du message');

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer le message',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <Box
      w="100%"
      h="100%"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
    >
      <VStack h="100%" spacing={0}>
        <Box
          flex="1"
          w="100%"
          overflowY="auto"
          p={4}
          bg="gray.50"
        >
          {messages.map((message) => (
            <Flex
              key={message.sid}
              mb={4}
              flexDirection={message.author === 'client' ? 'row-reverse' : 'row'}
            >
              <Avatar
                size="sm"
                name={message.author === 'client' ? 'Vous' : 'Service'}
                bg={message.author === 'client' ? 'blue.500' : 'green.500'}
                color="white"
                mr={message.author === 'client' ? 0 : 2}
                ml={message.author === 'client' ? 2 : 0}
              />
              <Box
                maxW="70%"
                bg={message.author === 'client' ? 'gray.700' : 'gray.600'}
                color={message.author === 'client' ? 'gray.200' : 'black'}
                p={3}
                borderRadius="lg"
                boxShadow="sm"
              >
                <Text fontSize="sm" whiteSpace="pre-wrap">{message.body}</Text>
                <Text 
                  fontSize="xs" 
                  color={message.author === 'client' ? 'gray.200' : 'gray.500'} 
                  mt={1}
                >
                  {formatTimestamp(message.dateCreated)}
                </Text>
              </Box>
            </Flex>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        <Flex
          w="100%"
          p={4}
          borderTopWidth="1px"
          bg="white"
          align="center"
        >
          <Input
            flex="1"
            mr={2}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <IconButton
            aria-label="Rafraîchir les messages"
            icon={<RefreshCw />}
            onClick={loadMessages}
            mr={2}
            isLoading={isLoading}
          />
          <Button
            colorScheme="blue"
            onClick={handleSendMessage}
            isLoading={isLoading}
            leftIcon={<Send size={20} />}
          >
            Envoyer
          </Button>
        </Flex>
      </VStack>
    </Box>
  );
};

export default DiscoveryFlightChat;
