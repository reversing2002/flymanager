import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiFormHelperText-root': {
            color: 'rgba(255, 255, 255, 0.7)', // Texte d'aide en blanc semi-transparent
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)', // Labels en blanc semi-transparent
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)', // Bordure en blanc semi-transparent
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)', // Bordure au survol
            },
          },
          '& .MuiInputBase-input': {
            color: '#ffffff', // Texte de l'input en blanc
          },
        },
      },
    },
  },
  palette: {
    mode: 'dark',
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
});
