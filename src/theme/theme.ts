import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiFormHelperText-root': {
            color: 'rgba(0, 0, 0, 0.7)',
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(0, 0, 0, 0.7)',
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          '& .MuiInputBase-input': {
            color: 'rgba(0, 0, 0, 0.87)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        },
      },
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    secondary: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
});
