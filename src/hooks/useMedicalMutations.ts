import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Medical } from '../types/medicals';
import { toast } from 'react-hot-toast';

interface MedicalData {
  user_id: string;
  medical_type_id: string;
  obtained_at: string;
  expires_at: string | null;
}

export function useMedicalMutations(userId: string) {
  const queryClient = useQueryClient();

  const createMedical = useMutation({
    mutationFn: async (data: MedicalData) => {
      const { data: newMedical, error } = await supabase
        .from('medicals')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return newMedical;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicals', userId] });
      toast.success('Certificat médical ajouté');
    },
    onError: (error) => {
      console.error('Error creating medical:', error);
      toast.error('Erreur lors de l\'ajout du certificat médical');
    },
  });

  const updateMedical = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MedicalData }) => {
      const { data: updatedMedical, error } = await supabase
        .from('medicals')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updatedMedical;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicals', userId] });
      toast.success('Certificat médical mis à jour');
    },
    onError: (error) => {
      console.error('Error updating medical:', error);
      toast.error('Erreur lors de la mise à jour du certificat médical');
    },
  });

  const deleteMedical = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medicals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicals', userId] });
      toast.success('Certificat médical supprimé');
    },
    onError: (error) => {
      console.error('Error deleting medical:', error);
      toast.error('Erreur lors de la suppression du certificat médical');
    },
  });

  return {
    createMedical,
    updateMedical,
    deleteMedical,
  };
}
