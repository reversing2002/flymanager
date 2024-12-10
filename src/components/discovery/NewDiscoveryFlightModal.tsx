import { useForm } from 'react-hook-form';
import { X, AlertTriangle } from 'lucide-react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Stack,
  useToast,
  FormHelperText,
  useDisclosure,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box
} from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { stripePromise } from '../../lib/stripe';
import { useSearchParams } from 'react-router-dom';

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
  club_id: string;
}

const NewDiscoveryFlightModal: React.FC<NewDiscoveryFlightModalProps> = ({ 
  isOpen: propIsOpen, 
  onClose: propOnClose,
  isPublic = false 
}) => {
  const { isOpen: defaultIsOpen, onClose: defaultOnClose } = useDisclosure({ defaultIsOpen: isPublic });
  const isOpen = propIsOpen ?? defaultIsOpen;
  const onClose = propOnClose ?? defaultOnClose;
  const [searchParams] = useSearchParams();
  const clubIdFromUrl = searchParams.get('club');

  const { data: club, isLoading: isLoadingClub, error: clubError } = useQuery({
    queryKey: ['club', clubIdFromUrl],
    queryFn: async () => {
      if (!clubIdFromUrl) return null;
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubIdFromUrl)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!clubIdFromUrl
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue
  } = useForm<FormData>({
    defaultValues: {
      club_id: clubIdFromUrl || ''
    }
  });
  
  const queryClient = useQueryClient();
  const toast = useToast();

  // Si le club n'existe pas et qu'on a fini de charger, afficher une erreur
  if (!isLoadingClub && clubIdFromUrl && !club) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay className="bg-black/50" />
        <ModalContent maxW="2xl" className="bg-white rounded-xl shadow-xl">
          <ModalHeader className="text-red-600">
            Club non trouvé
          </ModalHeader>
          <div className="p-6">
            <Alert status="error" variant="subtle" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" height="200px">
              <AlertIcon boxSize="40px" mr={0} />
              <AlertTitle mt={4} mb={1} fontSize="lg">
                Club introuvable
              </AlertTitle>
              <AlertDescription maxWidth="sm">
                Le club spécifié n'existe pas. Veuillez vérifier le lien ou contacter l'administrateur.
              </AlertDescription>
            </Alert>
          </div>
        </ModalContent>
      </Modal>
    );
  }

  // Si on est en train de charger, afficher un loader
  if (isLoadingClub) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay className="bg-black/50" />
        <ModalContent maxW="2xl" className="bg-white rounded-xl shadow-xl">
          <ModalHeader>
            Chargement...
          </ModalHeader>
          <div className="p-6 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
          </div>
        </ModalContent>
      </Modal>
    );
  }

  const onSubmit = async (data: FormData) => {
    try {
      // Créer la réservation dans Supabase
      const { data: flightData, error: flightError } = await supabase
        .from('discovery_flights')
        .insert([
          {
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            passenger_count: data.passenger_count,
            total_weight: data.total_weight,
            preferred_dates: data.preferred_dates,
            comments: data.comments,
            club_id: data.club_id,
            status: 'PENDING'
          }
        ])
        .select()
        .single();

      if (flightError) throw flightError;

      // Créer une conversation Twilio pour ce vol
      const conversationResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/conversations/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightId: flightData.id,
          customerPhone: data.contact_phone,
        }),
      });

      if (!conversationResponse.ok) {
        const errorData = await conversationResponse.json().catch(() => ({}));
        console.error('Erreur lors de la création de la conversation:', errorData);
      }

      // Créer la session de paiement Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe n\'est pas initialisé');

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stripe/create-discovery-flight-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flightId: flightData.id,
          customerEmail: data.contact_email,
          customerPhone: data.contact_phone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur lors de la création de la session: ${errorData.error || response.statusText}`);
      }

      const session = await response.json();

      // Rediriger vers la page de paiement Stripe
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la réservation',
        status: 'error',
        duration: 5000,
      });
    } finally {
      reset();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay className="bg-black/50" />
      <ModalContent maxW="2xl" className="bg-white rounded-xl shadow-xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>
            {isPublic ? 'Réserver un vol découverte' : 'Nouveau vol découverte'}
          </ModalHeader>
          {!isPublic && <ModalCloseButton />}
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

            <input type="hidden" {...register('club_id', { required: true })} />
          </div>

          <div className="flex justify-end space-x-4 p-6 border-t">
            <Button colorScheme="blue" type="submit" isLoading={isSubmitting}>
              {isPublic ? 'Envoyer ma demande' : 'Créer le vol découverte'}
            </Button>
            {!isPublic && (
              <Button variant="ghost" onClick={onClose}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default NewDiscoveryFlightModal;
