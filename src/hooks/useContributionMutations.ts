import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Contribution } from '../types/contribution';
import { toast } from 'react-hot-toast';

interface ContributionData {
  user_id: string;
  contribution_type_id: string;
  paid_at: string;
  expires_at: string | null;
  amount: number;
  payment_method: string;
  notes?: string;
}

export function useContributionMutations(userId: string) {
  const queryClient = useQueryClient();

  const createContribution = useMutation({
    mutationFn: async (data: ContributionData) => {
      const { data: newContribution, error } = await supabase
        .from('contributions')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return newContribution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions', userId] });
      toast.success('Cotisation ajoutée');
    },
    onError: (error) => {
      console.error('Error creating contribution:', error);
      toast.error('Erreur lors de l\'ajout de la cotisation');
    },
  });

  const updateContribution = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ContributionData }) => {
      const { data: updatedContribution, error } = await supabase
        .from('contributions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedContribution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions', userId] });
      toast.success('Cotisation mise à jour');
    },
    onError: (error) => {
      console.error('Error updating contribution:', error);
      toast.error('Erreur lors de la mise à jour de la cotisation');
    },
  });

  const deleteContribution = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contributions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions', userId] });
      toast.success('Cotisation supprimée');
    },
    onError: (error) => {
      console.error('Error deleting contribution:', error);
      toast.error('Erreur lors de la suppression de la cotisation');
    },
  });

  return {
    createContribution,
    updateContribution,
    deleteContribution,
  };
}
