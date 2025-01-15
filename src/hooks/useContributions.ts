import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Contribution } from '../types/contribution';

export function useContributions(userId: string) {
  return useQuery({
    queryKey: ['contributions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          contribution_type:contribution_types(*)
        `)
        .eq('user_id', userId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      return data as (Contribution & { contribution_type: any })[];
    },
  });
}
