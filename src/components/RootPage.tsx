import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HomePage from './public/HomePage';

const RootPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Si l'utilisateur n'est pas connecté, on affiche la HomePage
  return user ? null : <HomePage />;
};

export default RootPage;
