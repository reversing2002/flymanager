import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setupSupabase } from './lib/supabase/setup';
import App from './App.tsx';
import './index.css';
import { toast, Toaster } from 'react-hot-toast';

// Initialize Supabase
const initializeApp = async () => {
  try {
    const success = await setupSupabase();
    if (!success) {
      toast.error('Erreur lors de l\'initialisation de la base de données');
    }
  } catch (error) {
    console.error('Setup error:', error);
    toast.error('Erreur lors de l\'initialisation');
  }
};

// Start initialization
initializeApp();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster position="top-right" />
    <App />
  </StrictMode>
);