import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Stack,
  useToast,
  FormHelperText,
  Select
} from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

interface NewDiscoveryFlightModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  contact_email: string;
  contact_phone: string;
  passenger_count: number;
  total_weight: number;
  preferred_dates?: string;
  comments?: string;
  club_id: string;
}

export default function NewDiscoveryFlightModal({ isOpen, onClose }: NewDiscoveryFlightModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormData>();
  
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: clubs } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase
        .from('discovery_flights')
        .insert([{
          status: 'REQUESTED',
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          passenger_count: data.passenger_count,
          total_weight: data.total_weight,
          preferred_dates: data.preferred_dates,
          comments: data.comments,
          club_id: data.club_id
        }]);

      if (error) throw error;

      toast({
        title: 'Demande envoyée',
        description: 'Nous vous contacterons pour confirmer les disponibilités',
        status: 'success',
        duration: 5000,
      });

      queryClient.invalidateQueries({ queryKey: ['discoveryFlights'] });
      reset();
      onClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la création de la demande',
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay className="bg-black/50" />
      <ModalContent mx={4} className="bg-white rounded-xl shadow-xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">Nouveau vol découverte</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <FormControl isInvalid={!!errors.contact_email}>
              <FormLabel className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </FormLabel>
              <Input
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                {...register('contact_email', {
                  required: 'L\'email est requis',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email invalide'
                  }
                })}
              />
              <FormErrorMessage>
                {errors.contact_email?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.contact_phone}>
              <FormLabel className="block text-sm font-medium text-slate-700 mb-1">
                Téléphone
              </FormLabel>
              <Input
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                {...register('contact_phone', {
                  required: 'Le téléphone est requis'
                })}
              />
              <FormErrorMessage>
                {errors.contact_phone?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.passenger_count}>
              <FormLabel className="block text-sm font-medium text-slate-700 mb-1">
                Nombre de passagers
              </FormLabel>
              <Input
                type="number"
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                {...register('passenger_count', {
                  required: 'Le nombre de passagers est requis',
                  min: { value: 1, message: 'Minimum 1 passager' },
                  max: { value: 3, message: 'Maximum 3 passagers' }
                })}
              />
              <FormHelperText className="mt-2 text-sm text-slate-600">
                Maximum 3 passagers selon l'avion
              </FormHelperText>
              <FormErrorMessage>
                {errors.passenger_count?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.total_weight}>
              <FormLabel className="block text-sm font-medium text-slate-700 mb-1">
                Poids total des passagers (kg)
              </FormLabel>
              <Input
                type="number"
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                {...register('total_weight', {
                  required: 'Le poids total est requis',
                  min: { value: 30, message: 'Le poids doit être d\'au moins 30kg' },
                  max: { value: 300, message: 'Le poids total ne peut pas dépasser 300kg' }
                })}
              />
              <FormHelperText className="mt-2 text-sm text-slate-600">
                Poids total de tous les passagers
              </FormHelperText>
              <FormErrorMessage>
                {errors.total_weight?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.club_id} isRequired>
              <FormLabel className="block text-sm font-medium text-slate-700 mb-1">
                Club
              </FormLabel>
              <Select
                {...register('club_id', { required: 'Le club est requis' })}
                placeholder="Sélectionnez un club"
              >
                {clubs?.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>
                {errors.club_id?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel className="block text-sm font-medium text-slate-700 mb-1">
                Dates souhaitées
              </FormLabel>
              <Input
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                {...register('preferred_dates')}
                placeholder="Ex: Week-end, mercredi après-midi..."
              />
              <FormHelperText className="mt-2 text-sm text-slate-600">
                Indiquez vos disponibilités
              </FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel className="block text-sm font-medium text-slate-700 mb-1">
                Commentaires
              </FormLabel>
              <Input
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                {...register('comments')}
                placeholder="Informations complémentaires..."
              />
            </FormControl>
          </div>

          <div className="flex justify-end space-x-4 p-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Envoi...' : 'Envoyer la demande'}
            </button>
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
