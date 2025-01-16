import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type ClubSetupStatus = {
  isNewClub: boolean;
  isLoading: boolean;
};

export const useClubSetupStatus = (): ClubSetupStatus => {
  const { user, session } = useAuth();
  const [isNewClub, setIsNewClub] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkClubStatus = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Récupérer d'abord le club_id via club_members
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            club_members!inner(
              club:clubs(
                id
              )
            )
          `)
          .eq('auth_id', session.user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.club_members?.[0]?.club?.id) {
          setIsLoading(false);
          return;
        }

        const clubId = userData.club_members[0].club.id;

        // Vérifie si le club a des réservations
        const { count, error: reservationsError } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', clubId);

        if (reservationsError) throw reservationsError;

        // Si le club a des réservations, ce n'est plus un nouveau club
        setIsNewClub(count === 0);
      } catch (error) {
        console.error('Erreur lors de la vérification du statut du club:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkClubStatus();
  }, [session?.user?.id]);

  return { isNewClub, isLoading };
};
