import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { motion } from 'framer-motion';
import { ClubConfig } from './WelcomeAI';

interface ValidationCategory {
  key: string;
  label: string;
  isValid: boolean;
}

interface ImportValidationBoxProps {
  config: Partial<ClubConfig>;
}

export const ImportValidationBox: React.FC<ImportValidationBoxProps> = ({ config }) => {
  const categories: ValidationCategory[] = [
    { 
      key: 'members', 
      label: 'Membres', 
      isValid: Array.isArray(config.members) && config.members.length > 0 
    },
    { 
      key: 'aircrafts', 
      label: 'Appareils', 
      isValid: Array.isArray((config as any).aircrafts) && (config as any).aircrafts.length > 0 
    },
    {
      key: 'location',
      label: 'Localisation',
      isValid: !!config.coordinates?.latitude && !!config.coordinates?.longitude
    },
    {
      key: 'weatherStation',
      label: 'Station Météo',
      isValid: !!config.weatherStation
    }
  ];

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2,
        position: 'fixed',
        right: '20px',
        top: '100px',
        width: '250px',
        backgroundColor: 'background.paper',
      }}
    >
      <Typography variant="h6" gutterBottom>
        État de la Configuration
      </Typography>
      <Box sx={{ mt: 2 }}>
        {categories.map((category) => (
          <motion.div
            key={category.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 1,
                color: category.isValid ? 'success.main' : 'text.secondary',
              }}
            >
              {category.isValid ? (
                <CheckCircleIcon sx={{ mr: 1 }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ mr: 1 }} />
              )}
              <Typography>
                {category.label}
              </Typography>
            </Box>
          </motion.div>
        ))}
      </Box>
    </Paper>
  );
};

export default ImportValidationBox;
