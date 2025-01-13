import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import PublicLayout from './components/public/PublicLayout';
import HomePage from './components/public/HomePage';
import LoginPage from './components/auth/LoginPage';
import FAQ from './components/public/FAQPage';
import ContactPage from './components/public/ContactPage';
import CGVPage from './components/public/CGVPage';
import PricingPage from './components/public/PricingPage';
import { useAuth } from './contexts/AuthContext';

// Protège les routes qui nécessitent une authentification
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/faq',
        element: <FAQ />,
      },
      {
        path: '/contact',
        element: <ContactPage />,
      },
      {
        path: '/cgv',
        element: <CGVPage />,
      },
      {
        path: '/pricing',
        element: <PricingPage />,
      },
      // Ajoutez ici les autres routes publiques
    ],
  },
  // Routes protégées
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        {/* Votre layout d'application existant */}
      </ProtectedRoute>
    ),
    children: [
      // Vos routes d'application existantes
    ],
  },
]);

export default router;
