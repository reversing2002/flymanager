import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Box,
  Container,
  Paper
} from '@mui/material';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const clubSchema = z.object({
  clubName: z.string().min(3, 'Le nom du club doit contenir au moins 3 caractères'),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(10, 'Numéro de téléphone invalide'),
  position: z.string().min(2, 'Votre fonction est requise'),
  clubSize: z.enum(['1-10', '11-30', '31-50', '51+']),
  message: z.string().optional(),
});

type ClubFormData = z.infer<typeof clubSchema>;

const steps = [
  {
    icon: <AirplanemodeActiveIcon />,
    title: 'Information du club',
    description: 'Parlez-nous de votre aéroclub'
  },
  {
    icon: <GroupAddIcon />,
    title: 'Vos informations',
    description: 'Qui êtes-vous ?'
  },
  {
    icon: <SettingsIcon />,
    title: 'Finalisation',
    description: 'Derniers détails'
  }
];

const CreateClubPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClubFormData>({
    resolver: zodResolver(clubSchema),
    mode: 'onChange'
  });

  const formValues = watch();

  const onSubmit = async (data: ClubFormData) => {
    try {
      console.log('Form data:', data);
      toast.success('Demande envoyée avec succès ! Nous vous contacterons rapidement.');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la demande');
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const renderStepContent = (step: number) => {
    const commonTextFieldProps = {
      fullWidth: true,
      variant: "outlined" as const,
      sx: {
        mb: 3,
        '& .MuiOutlinedInput-root': {
          '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.23)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.5)',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#3f51b5',
          },
        },
        '& .MuiInputLabel-root': {
          color: 'rgba(255, 255, 255, 0.7)',
        },
        '& .MuiOutlinedInput-input': {
          color: 'white',
        },
      }
    };

    switch (step) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <TextField
              {...register('clubName')}
              label="Nom de l'aéroclub"
              error={!!errors.clubName}
              helperText={errors.clubName?.message}
              {...commonTextFieldProps}
            />
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Nombre de membres
              </InputLabel>
              <Select
                {...register('clubSize')}
                label="Nombre de membres"
                error={!!errors.clubSize}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                }}
              >
                <MenuItem value="1-10">1-10 membres</MenuItem>
                <MenuItem value="11-30">11-30 membres</MenuItem>
                <MenuItem value="31-50">31-50 membres</MenuItem>
                <MenuItem value="51+">51+ membres</MenuItem>
              </Select>
            </FormControl>
          </motion.div>
        );
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <TextField
              {...register('firstName')}
              label="Prénom"
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              {...commonTextFieldProps}
            />
            <TextField
              {...register('lastName')}
              label="Nom"
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              {...commonTextFieldProps}
            />
            <TextField
              {...register('position')}
              label="Votre fonction dans le club"
              placeholder="Ex: Président, Trésorier, Chef-pilote..."
              error={!!errors.position}
              helperText={errors.position?.message}
              {...commonTextFieldProps}
            />
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <TextField
              {...register('email')}
              label="Email"
              type="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              {...commonTextFieldProps}
            />
            <TextField
              {...register('phone')}
              label="Téléphone"
              type="tel"
              error={!!errors.phone}
              helperText={errors.phone?.message}
              {...commonTextFieldProps}
            />
            <TextField
              {...register('message')}
              label="Message (optionnel)"
              multiline
              rows={4}
              {...commonTextFieldProps}
            />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ minHeight: '100vh', py: 8 }}>
      <Paper 
        elevation={3}
        sx={{
          backgroundColor: '#1a1d21',
          p: { xs: 2, sm: 4, md: 6 },
          borderRadius: 2,
          color: 'white'
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Typography variant="h3" component="h1" gutterBottom>
            Créez votre club sur 4fly
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'gray.300', mb: 6 }}>
            Rejoignez les aéroclubs qui font confiance à 4fly pour leur gestion quotidienne.
            La création est gratuite et sans engagement.
          </Typography>
        </motion.div>

        <Stepper 
          activeStep={activeStep} 
          alternativeLabel
          sx={{ 
            mb: 8,
            '& .MuiStepLabel-label': {
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-active': {
                color: 'white',
              },
            },
            '& .MuiStepIcon-root': {
              color: 'rgba(255, 255, 255, 0.3)',
              '&.Mui-active': {
                color: '#3f51b5',
              },
              '&.Mui-completed': {
                color: '#4caf50',
              },
            },
          }}
        >
          {steps.map((step, index) => (
            <Step key={step.title}>
              <StepLabel
                icon={step.icon}
                optional={
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {step.description}
                  </Typography>
                }
              >
                {step.title}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ minHeight: '300px' }}>
            <AnimatePresence mode="wait">
              {renderStepContent(activeStep)}
            </AnimatePresence>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0}
              startIcon={<ArrowBackIcon />}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.23)',
                '&:hover': {
                  borderColor: 'white',
                },
              }}
            >
              Précédent
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                endIcon={<GroupAddIcon />}
                sx={{
                  bgcolor: '#3f51b5',
                  '&:hover': {
                    bgcolor: '#303f9f',
                  },
                }}
              >
                Créer mon club
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  bgcolor: '#3f51b5',
                  '&:hover': {
                    bgcolor: '#303f9f',
                  },
                }}
              >
                Suivant
              </Button>
            )}
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateClubPage;
