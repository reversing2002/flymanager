import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useRouter } from 'next/router';

const DiscoveryFlightSuccess = () => {
  const router = useRouter();

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 3,
        }}
      >
        <CheckCircleOutlineIcon
          sx={{ fontSize: 80, color: 'success.main' }}
        />
        
        <Typography variant="h4" component="h1" gutterBottom>
          Paiement réussi !
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          Votre réservation de vol découverte a été confirmée. Vous recevrez bientôt un email avec tous les détails.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={() => router.push('/')}
          sx={{ mt: 2 }}
        >
          Retour à l'accueil
        </Button>
      </Box>
    </Container>
  );
};

export default DiscoveryFlightSuccess;
