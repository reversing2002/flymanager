import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Box, Button, Container, Heading, Text, useClipboard } from '@chakra-ui/react';

const DiscoveryQRCode = () => {
  // L'URL complète de votre application + le chemin pour ouvrir la modal
  const qrCodeUrl = `${window.location.origin}/discovery/new`;
  const { hasCopied, onCopy } = useClipboard(qrCodeUrl);

  return (
    <Container maxW="container.sm" py={8}>
      <Box textAlign="center" bg="white" p={8} borderRadius="lg" boxShadow="sm">
        <Heading size="lg" mb={6}>QR Code - Vol Découverte</Heading>
        <Text mb={6} color="gray.600">
          Scannez ce QR code pour accéder directement au formulaire de réservation d'un vol découverte
        </Text>
        
        <Box
          bg="white"
          p={6}
          borderRadius="md"
          display="inline-block"
          boxShadow="sm"
          border="1px"
          borderColor="gray.200"
          mb={6}
        >
          <QRCodeSVG
            value={qrCodeUrl}
            size={256}
            level="H"
            includeMargin={true}
          />
        </Box>

        <Box>
          <Text fontSize="sm" mb={2} color="gray.600">URL du formulaire :</Text>
          <Text 
            fontSize="sm" 
            bg="gray.50" 
            p={2} 
            borderRadius="md" 
            mb={4}
            fontFamily="monospace"
          >
            {qrCodeUrl}
          </Text>
          <Button
            colorScheme="blue"
            onClick={onCopy}
            size="sm"
          >
            {hasCopied ? 'URL Copiée !' : 'Copier l\'URL'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default DiscoveryQRCode;
