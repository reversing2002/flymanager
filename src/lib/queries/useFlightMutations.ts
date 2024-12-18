import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFlight as createFlightApi, updateFlight as updateFlightApi } from './flights';
import type { Flight } from '../../types/database';

export function useCreateFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Flight>) => createFlightApi(data),
    onSuccess: () => {
      // Invalider et rafraîchir les requêtes de vols après création
      queryClient.invalidateQueries({ queryKey: ['flights'] });
    },
  });
}

export function useUpdateFlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string } & Partial<Flight>) => {
      const { id, ...flightData } = data;
      return updateFlightApi(id, flightData);
    },
    onSuccess: () => {
      // Invalider et rafraîchir les requêtes de vols après mise à jour
      queryClient.invalidateQueries({ queryKey: ['flights'] });
    },
  });
}
