import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Container,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import QuickAircraftAdd from './QuickAircraftAdd';
import WelcomeAI from '../welcome/WelcomeAI';

const setupSteps = [
  {
    label: 'Ajoutez vos appareils',
    description: 'Commencez par ajouter les avions de votre flotte.',
    icon: <AirplanemodeActiveIcon />,
    path: '/settings/aircraft',
    buttonText: 'Gérer la flotte',
  },
  {
    label: 'Invitez vos membres',
    description: 'Ajoutez les pilotes et instructeurs de votre club.',
    icon: <GroupAddIcon />,
    path: '/settings/members',
    buttonText: 'Gérer les membres',
  },
  {
    label: 'Accédez au planning',
    description: 'Visualisez et gérez les réservations de vos appareils.',
    icon: <EventAvailableIcon />,
    path: '/planning',
    buttonText: 'Voir le planning',
  },
];

const WelcomeDashboard = () => {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [clubName, setClubName] = useState<string>('');
  const [showAI, setShowAI] = useState(false);

  useEffect(() => {
    const fetchClubInfo = async () => {
      if (!session?.user?.id) return;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          club_members!inner(
            club:clubs(
              id,
              name
            )
          )
        `)
        .eq('auth_id', session.user.id)
        .single();

      if (userError) {
        console.error('Erreur lors de la récupération des données du club:', userError);
        return;
      }

      if (userData?.club_members?.[0]?.club) {
        setClubName(userData.club_members[0].club.name);
      }
    };

    fetchClubInfo();
  }, [session?.user?.id]);

  useEffect(() => {
    if (showAI) {
      // Ajouter le paramètre ai=true à l'URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('ai', 'true');
      window.history.pushState({}, '', newUrl);
    }
  }, [showAI]);

  if (showAI) {
    return (
      <Box 
        sx={{ 
          width: '100%',
          height: '100%',
          bgcolor: 'transparent',
          '& .MuiContainer-root': {
            bgcolor: 'transparent',
            maxWidth: 'none',
            padding: 0,
          }
        }}
      >
        <WelcomeAI />
      </Box>
    );
  }

  const handleStepClick = (path: string) => {
    navigate(path);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            background: 'transparent',
            textAlign: 'center',
            mb: 6
          }}
        >
          <Typography 
            variant="h2" 
            component="h1" 
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              mb: 2
            }}
          >
            Bienvenue sur 4fly
          </Typography>
          <Typography 
            variant="h4" 
            sx={{ 
              color: 'text.secondary',
              mb: 4
            }}
          >
            {clubName}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4 }}>
            <Button
              variant="contained"
              onClick={() => setShowAI(true)}
              startIcon={<SmartToyIcon />}
              sx={{
                bgcolor: '#3f51b5',
                '&:hover': {
                  bgcolor: '#303f9f',
                },
              }}
            >
              Configuration assistée par IA
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowAI(false)}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.23)',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                },
              }}
            >
              Configuration manuelle
            </Button>
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Nous sommes ravis de vous accueillir ! Pour commencer, vous pouvez soit utiliser notre assistant IA pour une configuration guidée, soit configurer manuellement votre club.
          </Typography>
        </Paper>

        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Stepper 
            activeStep={activeStep} 
            orientation="vertical"
            sx={{
              '& .MuiStepLabel-root': {
                py: 2,
              },
              '& .MuiStepContent-root': {
                borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                ml: 2.5,
              }
            }}
          >
            {setupSteps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: activeStep >= index ? 'primary.main' : 'action.disabled',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      {step.icon}
                    </Box>
                  )}
                >
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    {index === 0 ? (
                      // Affiche le composant QuickAircraftAdd pour la première étape
                      <QuickAircraftAdd />
                    ) : (
                      <Card 
                        variant="outlined"
                        sx={{ 
                          bgcolor: 'background.paper',
                          borderColor: 'divider',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: '0 0 0 1px rgba(33, 150, 243, 0.3)',
                          }
                        }}
                      >
                        <CardContent>
                          <Typography color="text.secondary" sx={{ mb: 2 }}>
                            {step.description}
                          </Typography>
                          <Button
                            variant="contained"
                            onClick={() => handleStepClick(step.path)}
                            endIcon={<ArrowForwardIcon />}
                            sx={{ mt: 1 }}
                          >
                            {step.buttonText}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            sx={{ 
              borderColor: 'rgba(255, 255, 255, 0.23)',
              color: 'text.secondary',
              '&:hover': {
                borderColor: 'primary.main',
                color: 'primary.main',
              }
            }}
          >
            Accéder au tableau de bord complet
          </Button>
        </Box>
      </motion.div>
    </Container>
  );
};

export default WelcomeDashboard;
