import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface NewDiscoveryFlightModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isPublic?: boolean;
}

interface FormData {
  contact_email: string;
  contact_phone: string;
  passenger_count: number;
  total_weight: number;
  preferred_dates?: string;
  comments?: string;
}

const NewDiscoveryFlightModal: React.FC<NewDiscoveryFlightModalProps> = ({ 
  isOpen: propIsOpen, 
  onClose: propOnClose,
  isPublic = false 
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>();

  const queryClient = useQueryClient();
  const { user } = useAuth();

  if (!user?.club?.id) {
    console.error('No club associated with user');
    return null;
  }

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase
        .from('discovery_flights')
        .insert([{
          ...data,
          club_id: user.club.id,
          status: 'PENDING'
        }]);

      if (error) throw error;

      toast.success('Vol de découverte créé avec succès');
      reset();
      if (propOnClose) propOnClose();
      queryClient.invalidateQueries(['discovery_flights']);
    } catch (error) {
      console.error('Error creating discovery flight:', error);
      toast.error('Erreur lors de la création du vol de découverte');
    }
  };

  if (!propIsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={propOnClose} />
      
      <div className="relative z-50 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Nouveau Vol de Découverte</h2>
          <button
            onClick={propOnClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de contact
            </label>
            <input
              {...register('contact_email', { required: 'Email requis' })}
              type="email"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.contact_email && (
              <p className="mt-1 text-sm text-red-600">{errors.contact_email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Téléphone de contact
            </label>
            <input
              {...register('contact_phone', { required: 'Téléphone requis' })}
              type="tel"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.contact_phone && (
              <p className="mt-1 text-sm text-red-600">{errors.contact_phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de passagers
            </label>
            <input
              {...register('passenger_count', { 
                required: 'Nombre de passagers requis',
                min: { value: 1, message: 'Minimum 1 passager' },
                max: { value: 3, message: 'Maximum 3 passagers' }
              })}
              type="number"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.passenger_count && (
              <p className="mt-1 text-sm text-red-600">{errors.passenger_count.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poids total (kg)
            </label>
            <input
              {...register('total_weight', { 
                required: 'Poids total requis',
                min: { value: 30, message: 'Poids minimum 30kg' },
                max: { value: 300, message: 'Poids maximum 300kg' }
              })}
              type="number"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {errors.total_weight && (
              <p className="mt-1 text-sm text-red-600">{errors.total_weight.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dates préférées
            </label>
            <input
              {...register('preferred_dates')}
              type="text"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: Week-end, matinée..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commentaires
            </label>
            <textarea
              {...register('comments')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={propOnClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewDiscoveryFlightModal;
