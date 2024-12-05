import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast, Box, Heading, Text, Container, VStack, Divider } from '@chakra-ui/react';
import { CheckCircle } from 'lucide-react';
import DiscoveryFlightChat from '../components/discovery/DiscoveryFlightChat';

const DiscoveryFlightSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const flightId = searchParams.get('flight_id');
  const customerPhone = searchParams.get('customer_phone');

  useEffect(() => {
    toast({
      title: 'Paiement réussi',
      description: 'Votre vol découverte a été réservé avec succès',
      status: 'success',
      duration: 5000,
    });
  }, [toast]);

  return (
    <Container maxW="container.md" py={10}>
      <VStack spacing={6} align="center">
        <Box color="green.500">
          <CheckCircle size={64} />
        </Box>
        <Heading size="xl" textAlign="center">
          Réservation confirmée !
        </Heading>
        <Text fontSize="lg" textAlign="center" color="gray.600">
          Merci d'avoir réservé votre vol découverte. Nous vous contacterons prochainement pour confirmer les détails de votre vol.
        </Text>
        <Text fontSize="md" textAlign="center" color="gray.500">
          Un email de confirmation vous a été envoyé.
        </Text>

        {flightId && customerPhone && (
          <>
            <Divider my={6} />
            <Heading size="md" textAlign="center">
              Communication avec le service
            </Heading>
            <Text fontSize="md" textAlign="center" color="gray.600" mb={4}>
              Utilisez ce chat pour communiquer avec nous concernant votre vol découverte
            </Text>
            <DiscoveryFlightChat flightId={flightId} customerPhone={customerPhone} />
          </>
        )}
      </VStack>
    </Container>
  );
};

export default DiscoveryFlightSuccessPage;
