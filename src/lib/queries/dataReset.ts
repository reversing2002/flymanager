import { supabase } from '../supabase';
import { adminService } from '../supabase/adminClient';
import { toast } from 'react-hot-toast';

/**
 * Réinitialise les données d'un club en supprimant tous les membres (sauf admin) et la flotte
 * @param clubId - L'ID du club à réinitialiser
 * @param adminId - L'ID de l'administrateur à préserver
 * @returns Promise<void>
 */
export const resetClubData = async (clubId: string, adminId: string): Promise<void> => {
  try {
    // 1. Récupérer tous les membres du club sauf l'admin via club_members
    const { data: members, error: membersError } = await supabase
      .from('club_members')
      .select('user_id')
      .eq('club_id', clubId)
      .neq('user_id', adminId);

    if (membersError) {
      throw new Error(`Erreur lors de la récupération des membres: ${membersError.message}`);
    }

    // 2. Supprimer les membres via adminService
    const deletionPromises = members.map(member => 
      adminService.deleteUser(member.user_id)
        .catch(error => {
          console.error(`Erreur lors de la suppression du membre ${member.user_id}:`, error);
          toast.error(`Erreur lors de la suppression d'un membre: ${error.message}`);
        })
    );

    await Promise.all(deletionPromises);

    // 3. Supprimer la flotte
    const { error: aircraftError } = await supabase
      .from('aircraft')
      .delete()
      .eq('club_id', clubId);

    if (aircraftError) {
      throw new Error(`Erreur lors de la suppression de la flotte: ${aircraftError.message}`);
    }

    toast.success('Réinitialisation des données du club effectuée avec succès');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des données:', error);
    toast.error(`Erreur lors de la réinitialisation: ${error.message}`);
    throw error;
  }
};
