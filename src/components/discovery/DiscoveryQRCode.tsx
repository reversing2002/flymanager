import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  useClipboard,
  VStack,
  HStack,
  Icon,
  List,
  ListItem,
  ListIcon,
  Image,
  useColorModeValue,
  Skeleton,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { FaPhone, FaMapMarkerAlt, FaEnvelope, FaClock, FaPlane, FaCheckCircle } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Logo } from '../common/Logo';

const DiscoveryQRCode = () => {
  const { user } = useAuth();
  const clubId = user?.club?.id;
  const qrCodeUrl = `${window.location.origin}/discovery/new${clubId ? `?club=${clubId}` : ''}`;
  const { hasCopied, onCopy } = useClipboard(qrCodeUrl);
  const toast = useToast();

  const glassEffect = {
    bg: 'whiteAlpha.50',
    backdropFilter: 'blur(10px)',
    border: '1px solid',
    borderColor: 'whiteAlpha.100',
  };
  
  const primaryColor = useColorModeValue('blue.600', 'blue.400');
  const secondaryBg = useColorModeValue('blue.50', 'blue.900');

  // Récupération des informations du club
  const { data: clubData, isLoading: isLoadingClub } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      if (!clubId) return null;
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clubId,
    onError: (error) => {
      console.error('Error fetching club data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les informations du club',
        status: 'error',
        duration: 5000,
      });
    }
  });

  // Récupération des informations du vol découverte
  const { data: discoveryFlightInfo } = useQuery({
    queryKey: ['discoveryFlightPrice', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovery_flight_prices')
        .select('*')
        .eq('club_id', clubId)
        .single();

      if (error) throw error;
      return data || { price: 130, duration: 30 };
    },
  });

  const { data: features } = useQuery({
    queryKey: ['discoveryFlightFeatures', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovery_flight_features')
        .select('*')
        .eq('club_id', clubId)
        .order('display_order');

      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = isLoadingClub || !discoveryFlightInfo || !features;

  if (isLoading) {
    return (
      <Container maxW="container.md" py={8} px={4}>
        <VStack spacing={8} align="stretch">
          <Skeleton height="200px" borderRadius="xl" />
          <Skeleton height="150px" borderRadius="xl" />
          <Skeleton height="250px" borderRadius="xl" />
          <Skeleton height="200px" borderRadius="xl" />
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.md" py={8} px={4} className="print">
      <VStack spacing={8} align="stretch">
        {/* Logo et En-tête */}
        <Box textAlign="center" {...glassEffect} p={8} borderRadius="xl" boxShadow="base">
          <Logo className="mx-auto mb-4" />
          {clubData?.logo_url && (
            <Image 
              src={clubData.logo_url} 
              alt={clubData.name} 
              maxH="100px" 
              mx="auto" 
              mb={6}
            />
          )}
          <Heading size="lg" mb={4} color="white">Vol Découverte</Heading>
          <Text fontSize="xl" fontWeight="bold" color="white" mb={2}>
            Offrez-vous une expérience inoubliable !
          </Text>
          <Text color="whiteAlpha.800" fontSize="lg">
            Découvrez votre région vue du ciel
          </Text>
        </Box>

        {/* Prix et Informations principales */}
        <Box bg={secondaryBg} p={6} borderRadius="xl" boxShadow="base" border="1px" borderColor="whiteAlpha.100">
          <VStack spacing={4} align="center">
            <Heading size="2xl" color={primaryColor}>{discoveryFlightInfo.price}€</Heading>
            <Text fontSize="xl" fontWeight="medium">Vol découverte {discoveryFlightInfo.duration} minutes</Text>
            <HStack spacing={6} mt={2}>
              <VStack align="center">
                <Icon as={FaPlane} color={primaryColor} boxSize={6} />
                <Text>Briefing inclus</Text>
              </VStack>
              <VStack align="center">
                <Icon as={FaClock} color={primaryColor} boxSize={6} />
                <Text>Réservation facile</Text>
              </VStack>
            </HStack>
          </VStack>
        </Box>

        {/* QR Code */}
        <Box textAlign="center" {...glassEffect} p={6} borderRadius="xl" boxShadow="base">
          <Text mb={4} fontSize="lg" fontWeight="medium">
            Scannez pour réserver votre vol
          </Text>
          <Box
            bg="whiteAlpha.50"
            p={4}
            borderRadius="xl"
            display="inline-block"
            boxShadow="base"
            mb={4}
          >
            <QRCodeSVG
              value={qrCodeUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </Box>
        </Box>

        {/* Informations pratiques */}
        <Box {...glassEffect} p={6} borderRadius="xl" boxShadow="base">
          <Heading size="md" mb={4} color="white">Ce qui est inclus :</Heading>
          <List spacing={3} color="white">
            {features?.map((feature) => (
              <ListItem key={feature.id}>
                <ListIcon as={FaCheckCircle} color="green.500" />
                {feature.description}
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Coordonnées du club */}
        <Box {...glassEffect} p={6} borderRadius="xl" boxShadow="base">
          <Heading size="md" mb={4} color="white">Nous contacter</Heading>
          <VStack align="start" spacing={3} color="white">
            <HStack>
              <Icon as={FaMapMarkerAlt} color={primaryColor} />
              <Text>{clubData?.address || "Aérodrome"}</Text>
            </HStack>
            <HStack>
              <Icon as={FaPhone} color={primaryColor} />
              <Text>{clubData?.phone || "Contactez-nous"}</Text>
            </HStack>
            <HStack>
              <Icon as={FaEnvelope} color={primaryColor} />
              <Text>{clubData?.email || "contact@club.fr"}</Text>
            </HStack>
          </VStack>
        </Box>

        {/* URL du formulaire en bas */}
        <Box bg="gray.50" p={4} borderRadius="xl" border="1px" borderColor="whiteAlpha.100">
          <Text fontSize="sm" color="gray.600" mb={2}>URL du formulaire :</Text>
          <HStack>
            <Text 
              fontSize="sm"
              fontFamily="monospace"
              flex="1"
              noOfLines={1}
            >
              {qrCodeUrl}
            </Text>
            <Button
              colorScheme="blue"
              onClick={onCopy}
              size="sm"
            >
              {hasCopied ? 'URL Copiée !' : 'Copier'}
            </Button>
          </HStack>
        </Box>
      </VStack>
    </Container>
  );
};

export default DiscoveryQRCode;
