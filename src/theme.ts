import { createTheme } from '@mui/material/styles';
import { frFR } from '@mui/material/locale';

// Palette de couleurs moderne et professionnelle
const colors = {
  primary: {
    main: '#2563EB', // Bleu moderne
    light: '#60A5FA',
    dark: '#1E40AF',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#10B981', // Vert émeraude
    light: '#34D399',
    dark: '#059669',
    contrastText: '#FFFFFF',
  },
  accent: {
    main: '#8B5CF6', // Violet
    light: '#A78BFA',
    dark: '#6D28D9',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    contrastText: '#FFFFFF',
  },
  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F9FAFB',
    paper: '#FFFFFF',
    dark: '#1F2937',
  },
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    disabled: '#9CA3AF',
  },
  divider: '#E5E7EB',
};

// Création du thème personnalisé
const theme = createTheme({
  palette: colors,
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '1rem',
        },
      },
    },
  },
}, frFR);

export default theme;

// Exportation des couleurs pour utilisation avec Tailwind
export const tailwindColors = {
  primary: colors.primary.main,
  'primary-light': colors.primary.light,
  'primary-dark': colors.primary.dark,
  secondary: colors.secondary.main,
  'secondary-light': colors.secondary.light,
  'secondary-dark': colors.secondary.dark,
  accent: colors.accent.main,
  'accent-light': colors.accent.light,
  'accent-dark': colors.accent.dark,
  error: colors.error.main,
  warning: colors.warning.main,
  info: colors.info.main,
  success: colors.success.main,
};
