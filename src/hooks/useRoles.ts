import { useQuery } from '@tanstack/react-query';
import { UserGroup, updateSystemRoleGroups } from '../types/roles';
import { updateRoleLabels } from '../lib/utils/roleUtils';
import { supabase } from '../lib/supabase';

export const useRoles = (clubId?: string) => {
  console.log('[useRoles] Hook appelé avec clubId:', clubId);

  const query = useQuery({
    queryKey: ['user-groups', clubId],
    queryFn: async () => {
      console.log('[useRoles] Construction de la requête');
      
      let query = supabase
        .from('user_groups')
        .select('*');

      // Si un clubId est fourni, filtrer par club et inclure les rôles système
      if (clubId) {
        console.log('[useRoles] Filtrage par clubId:', clubId);
        query = query.or(`club_id.eq.${clubId},is_system.eq.true,club_id.is.null`);
      } else {
        console.log('[useRoles] Pas de clubId fourni, récupération de tous les rôles');
      }

      // Toujours trier par code
      query = query.order('code');

      console.log('[useRoles] Exécution de la requête');
      const { data, error } = await query;

      if (error) {
        console.error('[useRoles] Erreur lors de la récupération des rôles:', error);
        throw error;
      }

      console.log('[useRoles] Données brutes reçues:', data);

      if (!data || data.length === 0) {
        console.warn('[useRoles] Aucun rôle trouvé');
        return [];
      }

      const groups = data as UserGroup[];
      
      console.log('[useRoles] Mise à jour des rôles système avec:', groups);
      // Met à jour les groupes de rôles système
      updateSystemRoleGroups(groups);
      
      console.log('[useRoles] Mise à jour des libellés avec:', groups);
      // Met à jour les libellés des rôles
      updateRoleLabels(groups);

      return groups;
    },
    // Rafraîchir les données toutes les 5 minutes
    staleTime: 5 * 60 * 1000,
    // Garder les données en cache pendant 10 minutes
    cacheTime: 10 * 60 * 1000,
    // Activer le mode suspense pour gérer le chargement
    suspense: false,
    // S'assurer que la requête est exécutée immédiatement
    enabled: true,
    // Réessayer en cas d'erreur
    retry: 1,
    // Log les erreurs
    onError: (error) => {
      console.error('[useRoles] Erreur dans useQuery:', error);
    },
    // Log le succès
    onSuccess: (data) => {
      console.log('[useRoles] Données reçues dans useQuery:', data);
    }
  });

  console.log('[useRoles] État du hook:', {
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    data: query.data,
    status: query.status
  });

  return query;
};
