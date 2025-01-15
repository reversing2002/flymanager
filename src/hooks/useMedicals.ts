import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Medical } from '../types/medicals';

export function useMedicals(userId: string) {
  return useQuery({
    queryKey: ['medicals', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicals')
        .select(`
          *,
          medical_type:medical_types(*)
        `)
        .eq('user_id', userId)
        .order('obtained_at', { ascending: false });

      if (error) throw error;
      return data as (Medical & { medical_type: any })[];
    },
  });
}
