import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Logo } from "../common/Logo";
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { gtagReportConversion } from "../../lib/analytics";
import { useTranslation } from 'react-i18next';
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Typography,
  Box,
  Container,
  Paper,
} from "@mui/material";
import AirplanemodeActiveIcon from "@mui/icons-material/AirplanemodeActive";
import PersonIcon from "@mui/icons-material/Person";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import toast from "react-hot-toast";

interface CreateClubFormData {
  clubName: string;
  clubCode: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  adminLogin: string;
}

const generateLogin = (firstName: string, lastName: string): string => {
  // Retire les accents et caractères spéciaux
  const normalizeString = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  };

  const normalizedFirstName = normalizeString(firstName);
  const normalizedLastName = normalizeString(lastName);

  // Prend la première lettre du prénom et le nom complet
  return `${normalizedFirstName.charAt(0)}${normalizedLastName}`;
};

const CreateClubPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<CreateClubFormData>({
    clubName: "",
    clubCode: "",
    adminEmail: "",
    adminPassword: "",
    adminFirstName: "",
    adminLastName: "",
    adminLogin: "",
  });

  const steps = [
    {
      icon: <AirplanemodeActiveIcon />,
      title: t('createClub.form.clubInfo.title'),
      description: t('createClub.hero.subtitle'),
    },
    {
      icon: <PersonIcon />,
      title: t('createClub.form.adminInfo.title'),
      description: t('createClub.form.adminInfo.title'),
    },
    {
      icon: <VpnKeyIcon />,
      title: t('createClub.form.adminInfo.password.label'),
      description: t('createClub.form.adminInfo.password.placeholder'),
    },
  ];

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStep !== steps.length - 1) {
      handleNext();
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data, error: clubError } = await supabase.rpc(
        "create_club_with_admin",
        {
          p_club_name: formData.clubName,
          p_club_code: formData.clubCode,
          p_admin_email: formData.adminEmail,
          p_admin_password: formData.adminPassword,
          p_admin_login: formData.adminLogin,
          p_admin_first_name: formData.adminFirstName,
          p_admin_last_name: formData.adminLastName,
        }
      );

      if (clubError) throw clubError;
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.adminEmail,
        password: formData.adminPassword,
      });

      if (signInError) throw signInError;

      gtagReportConversion();

      toast.success(t('createClub.form.success'));
    } catch (error: any) {
      setError(error.message);
      toast.error(t('createClub.form.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      if (name === 'adminFirstName' || name === 'adminLastName') {
        const firstName = name === 'adminFirstName' ? value : prev.adminFirstName;
        const lastName = name === 'adminLastName' ? value : prev.adminLastName;
        
        if (firstName && lastName) {
          newData.adminLogin = generateLogin(firstName, lastName);
        }
      }
      
      return newData;
    });
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const commonTextFieldProps = {
    fullWidth: true,
    variant: "outlined" as const,
    sx: {
      mb: 3,
      "& .MuiOutlinedInput-root": {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        "& fieldset": {
          borderColor: "rgba(255, 255, 255, 0.23)",
        },
        "&:hover fieldset": {
          borderColor: "rgba(255, 255, 255, 0.5)",
        },
        "&.Mui-focused fieldset": {
          borderColor: "#3f51b5",
        },
      },
      "& .MuiInputLabel-root": {
        color: "#fff",
      },
      "& .MuiOutlinedInput-input": {
        color: "#fff",
      },
      "& .MuiFormHelperText-root": {
        color: "rgba(255, 255, 255, 0.7)",
      },
    },
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <TextField
              label={t('createClub.form.clubInfo.name.label')}
              name="clubName"
              value={formData.clubName}
              onChange={handleChange}
              required
              placeholder={t('createClub.form.clubInfo.name.placeholder')}
              error={!formData.clubName}
              helperText={!formData.clubName ? t('createClub.form.clubInfo.name.error') : ''}
              {...commonTextFieldProps}
            />
            <TextField
              label={t('createClub.form.clubInfo.icao.label')}
              name="clubCode"
              value={formData.clubCode}
              onChange={handleChange}
              required
              placeholder={t('createClub.form.clubInfo.icao.placeholder')}
              error={!formData.clubCode}
              helperText={!formData.clubCode ? t('createClub.form.clubInfo.icao.error') : t('createClub.form.clubInfo.icao.valid')}
              inputProps={{
                maxLength: 10,
                pattern: "[A-Za-z0-9]{3,10}",
                style: { textTransform: "uppercase" },
              }}
              {...commonTextFieldProps}
            />
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
              label={t('createClub.form.adminInfo.firstName.label')}
              name="adminFirstName"
              value={formData.adminFirstName}
              onChange={handleChange}
              required
              placeholder={t('createClub.form.adminInfo.firstName.placeholder')}
              error={!formData.adminFirstName}
              helperText={!formData.adminFirstName ? t('createClub.form.adminInfo.firstName.error') : ''}
              {...commonTextFieldProps}
            />
            <TextField
              label={t('createClub.form.adminInfo.lastName.label')}
              name="adminLastName"
              value={formData.adminLastName}
              onChange={handleChange}
              required
              placeholder={t('createClub.form.adminInfo.lastName.placeholder')}
              error={!formData.adminLastName}
              helperText={!formData.adminLastName ? t('createClub.form.adminInfo.lastName.error') : ''}
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
              label={t('createClub.form.adminInfo.email.label')}
              name="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={handleChange}
              required
              placeholder={t('createClub.form.adminInfo.email.placeholder')}
              error={!formData.adminEmail}
              helperText={!formData.adminEmail ? t('createClub.form.adminInfo.email.error') : t('createClub.form.adminInfo.email.valid')}
              {...commonTextFieldProps}
            />
            <TextField
              label={t('createClub.form.adminInfo.password.label')}
              name="adminPassword"
              type="password"
              value={formData.adminPassword}
              onChange={handleChange}
              required
              placeholder={t('createClub.form.adminInfo.password.placeholder')}
              error={!formData.adminPassword}
              helperText={
                !formData.adminPassword 
                  ? t('createClub.form.adminInfo.password.error')
                  : `${t('createClub.form.adminInfo.password.requirements.length')}, 
                     ${t('createClub.form.adminInfo.password.requirements.uppercase')}, 
                     ${t('createClub.form.adminInfo.password.requirements.lowercase')}, 
                     ${t('createClub.form.adminInfo.password.requirements.number')}, 
                     ${t('createClub.form.adminInfo.password.requirements.special')}`
              }
              {...commonTextFieldProps}
            />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: "100vh", py: 8 }}>
      <Paper
        elevation={3}
        sx={{
          backgroundColor: "#1a1d21",
          p: { xs: 2, sm: 4 },
          borderRadius: 2,
          color: "white",
        }}
      >
        <Box className="flex flex-col items-center mb-8">
          <Logo className="mb-2" />
          <Typography variant="subtitle1" sx={{ color: "gray.400" }}>
            {t('createClub.hero.title')}
          </Typography>
        </Box>

        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            mb: 4,
            '& .MuiStepLabel-label': {
              color: 'rgba(255, 255, 255, 0.5)',
              '&.Mui-completed': {
                color: '#90caf9',
              },
              '&.Mui-active': {
                color: '#fff',
              },
            },
            '& .MuiStepIcon-root': {
              color: 'rgba(255, 255, 255, 0.3)',
              '&.Mui-completed': {
                color: '#90caf9',
              },
              '&.Mui-active': {
                color: '#3f51b5',
              },
            },
            '& .MuiStepConnector-line': {
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
            '& .MuiStepConnector-root.Mui-completed .MuiStepConnector-line': {
              borderColor: '#90caf9',
            },
            '& .MuiStepLabel-iconContainer': {
              '& .MuiSvgIcon-root': {
                fontSize: '2rem',
              },
            },
          }}
        >
          {steps.map((step) => (
            <Step key={step.title}>
              <StepLabel
                icon={step.icon}
                optional={
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255, 255, 255, 0.5)" }}
                  >
                    {step.description}
                  </Typography>
                }
              >
                {step.title}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <form onSubmit={handleSubmit}>
          <Box sx={{ minHeight: "250px" }}>
            <AnimatePresence mode="wait">
              {renderStepContent(activeStep)}
            </AnimatePresence>
          </Box>

          {error && (
            <Typography
              color="error"
              variant="body2"
              sx={{ mt: 2, textAlign: "center" }}
            >
              {error}
            </Typography>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{
                color: "#fff",
                "&.Mui-disabled": {
                  color: "rgba(255, 255, 255, 0.3)",
                },
              }}
            >
              {t('common.back')}
            </Button>
            <Button
              endIcon={activeStep === steps.length - 1 ? undefined : <ArrowForwardIcon />}
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              sx={{
                backgroundColor: "#3f51b5",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#303f9f",
                },
              }}
            >
              {activeStep === steps.length - 1 ? t('createClub.form.submit') : t('common.next')}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default CreateClubPage;
