import React from 'react';
import { Container, Box } from '@chakra-ui/react';
import NewDiscoveryFlightModal from '../components/discovery/NewDiscoveryFlightModal';

const NewDiscoveryFlightPage = () => {
  return (
    <Container maxW="container.md" py={8}>
      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <NewDiscoveryFlightModal isPublic={true} />
      </Box>
    </Container>
  );
};

export default NewDiscoveryFlightPage;
