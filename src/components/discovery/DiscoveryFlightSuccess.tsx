import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Box, Heading, Text, Button, VStack, Divider } from '@chakra-ui/react';
import { CheckCircle } from 'lucide-react';

interface Message {
  sid: string;
  author: string;
  body: string;
  dateCreated: string;
}

interface Conversation {
  sid: string;
  friendlyName: string;
  messages: Message[];
}

const DiscoveryFlightSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  
  // Extraire l'ID du vol depuis l'URL ou le state
  const flightId = new URLSearchParams(location.search).get('flightId');

  useEffect(() => {
    const fetchMessages = async () => {
      if (!flightId) return;
      
      try {
        const response = await fetch(`/api/conversations/${flightId}/messages`);
        if (!response.ok) throw new Error('Erreur lors de la récupération des messages');
        
        const data = await response.json();
        setConversation(data.conversation);
      } catch (error) {
        console.error('Erreur:', error);
      }
    };

    fetchMessages();
  }, [flightId]);

  return (
    <Container maxW="container.sm" py={8}>
      <Box
        textAlign="center"
        bg="white"
        p={8}
        borderRadius="lg"
        boxShadow="sm"
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={6}
      >
        <CheckCircle size={64} color="#38A169" strokeWidth={2} />
        
        <Heading size="lg">
          Paiement réussi !
        </Heading>
        
        <Text color="gray.600">
          Votre réservation de vol découverte a été confirmée. Vous recevrez bientôt un email avec tous les détails.
        </Text>

        {conversation && (
          <VStack w="100%" spacing={4} align="stretch">
            <Divider my={4} />
            <Heading size="md">Messages</Heading>
            {conversation.messages.map((message) => (
              <Box
                key={message.sid}
                p={4}
                bg={message.author === 'service' ? 'blue.50' : 'gray.50'}
                borderRadius="md"
                borderLeftWidth={4}
                borderLeftColor={message.author === 'service' ? 'blue.500' : 'gray.500'}
              >
                <Text fontSize="sm" color="gray.500" mb={1}>
                  {new Date(message.dateCreated).toLocaleString()}
                </Text>
                <Text whiteSpace="pre-wrap">{message.body}</Text>
              </Box>
            ))}
          </VStack>
        )}

        <Button
          colorScheme="blue"
          onClick={() => navigate('/')}
          size="lg"
          mt={4}
        >
          Retour à l'accueil
        </Button>
      </Box>
    </Container>
  );
};

export default DiscoveryFlightSuccess;
