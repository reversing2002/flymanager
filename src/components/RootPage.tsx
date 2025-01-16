import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HomePage from './public/HomePage';
import { supabase } from '../lib/supabase';

const RootPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkClubStatus = async () => {
      if (!user?.club?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Récupérer le nombre d'avions
        const { data: aircraft, error: aircraftError } = await supabase
          .from('aircraft')
          .select('id')
          .eq('club_id', user.club.id);

        if (aircraftError) throw aircraftError;

        // Récupérer le nombre de membres
        const { data: members, error: membersError } = await supabase
          .from('club_members')
          .select('user_id')
          .eq('club_id', user.club.id);

        if (membersError) throw membersError;

        // Rediriger vers WelcomeAI si le club est nouveau
        if (!aircraft?.length || (members?.length || 0) < 2) {
          navigate('/welcome');
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut du club:', error);
        navigate('/dashboard'); // En cas d'erreur, rediriger vers le dashboard par défaut
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      checkClubStatus();
    } else {
      setIsLoading(false);
    }
  }, [user, navigate]);

  if (isLoading) {
    return null; // ou un composant de chargement
  }

  return user ? null : <HomePage />;
};

export default RootPage;
