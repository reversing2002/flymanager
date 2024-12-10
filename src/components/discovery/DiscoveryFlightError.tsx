import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Heading, Text, Button, Stack } from '@chakra-ui/react';
import { XCircle } from 'lucide-react';

const DiscoveryFlightError: React.FC = () => {
  const navigate = useNavigate();

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
        <XCircle size={64} color="#E53E3E" strokeWidth={2} />
        
        <Heading size="lg">
          Une erreur est survenue
        </Heading>
        
        <Text color="gray.600">
          Le paiement n'a pas pu être effectué. Vous pouvez réessayer ou contacter notre support si le problème persiste.
        </Text>

        <Stack direction={{ base: 'column', md: 'row' }} spacing={4} w="100%">
          <Button
            colorScheme="blue"
            onClick={() => navigate('/discovery/new')}
            size="lg"
            flex={1}
          >
            Réessayer
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            size="lg"
            flex={1}
          >
            Retour à l'accueil
          </Button>
        </Stack>
      </Box>
    </Container>
  );
};

export default DiscoveryFlightError;
