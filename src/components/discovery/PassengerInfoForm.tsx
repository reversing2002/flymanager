import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { EmergencyContact, PassengerInfo, DiscoveryFlight } from '../../types/discovery';
import { Plus, Trash2, Upload } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { AlertCircle } from 'lucide-react';

// Fonction utilitaire pour calculer l'âge
const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Schéma de validation
const emergencyContactSchema = z.object({
  nom: z.string().min(2, 'Le nom est requis'),
  adresse: z.string().min(5, 'L\'adresse est requise'),
  telephone: z.string().regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, 'Numéro de téléphone invalide')
});

const passengerSchema = z.object({
  nom: z.string().min(2, 'Le nom est requis'),
  prenom: z.string().min(2, 'Le prénom est requis'),
  dateNaissance: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Date de naissance invalide'),
  age: z.number().min(0, 'L\'âge est requis'),
  poids: z.number().min(20, 'Le poids doit être d\'au moins 20 kg').max(200, 'Le poids ne peut pas dépasser 200 kg'),
  contactsUrgence: z.array(emergencyContactSchema).min(1, 'Au moins un contact d\'urgence est requis'),
  autorisationParentale1: z.string(),
  autorisationParentale2: z.string(),
  parent1Nom: z.string().optional(),
  parent1Prenom: z.string().optional(),
  parent2Nom: z.string().optional(),
  parent2Prenom: z.string().optional(),
  signatureDate1: z.string().optional(),
  signatureDate2: z.string().optional(),
}).refine((data) => {
  if (calculateAge(data.dateNaissance) < 18) {
    return data.autorisationParentale1.length > 0;
  }
  return true;
}, {
  message: 'La signature du premier parent est requise pour un passager mineur',
  path: ['autorisationParentale1']
}).refine((data) => {
  if (calculateAge(data.dateNaissance) < 18) {
    return data.autorisationParentale2.length > 0;
  }
  return true;
}, {
  message: 'La signature du second parent est requise pour un passager mineur',
  path: ['autorisationParentale2']
});

const formSchema = z.object({
  passengers: z.array(passengerSchema).min(1, 'Au moins un passager est requis'),
});

type FormData = {
  passengers: (PassengerInfo & {
    age: number;
    poids: number;
    autorisationParentale1?: string;
    autorisationParentale2?: string;
    parent1Nom?: string;
    parent1Prenom?: string;
    parent2Nom?: string;
    parent2Prenom?: string;
    signatureDate1?: string;
    signatureDate2?: string;
  })[];
};

export const PassengerInfoForm: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [currentPassengerIndex, setCurrentPassengerIndex] = React.useState<number>(0);
  const [currentParentIndex, setCurrentParentIndex] = React.useState<number>(1);
  const signatureRefs = React.useRef<{ [key: string]: SignatureCanvas | null }>({});

  // Fonction pour obtenir la clé unique de la référence de signature
  const getSignatureRefKey = (passengerIndex: number, parentIndex: number) => {
    return `signature_${passengerIndex}_${parentIndex}`;
  };

  // Fonction pour obtenir la référence de signature
  const getSignatureRef = (passengerIndex: number, parentIndex: number) => {
    const key = getSignatureRefKey(passengerIndex, parentIndex);
    return signatureRefs.current[key];
  };

  // Fonction pour définir la référence de signature
  const setSignatureRef = (passengerIndex: number, parentIndex: number, ref: SignatureCanvas | null) => {
    const key = getSignatureRefKey(passengerIndex, parentIndex);
    signatureRefs.current[key] = ref;
  };

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors }, trigger } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengers: [{ 
        nom: '',
        prenom: '',
        dateNaissance: '',
        age: 0,
        poids: 0,
        contactsUrgence: [{}],
        autorisationParentale1: '',
        autorisationParentale2: '',
        parent1Nom: '',
        parent1Prenom: '',
        parent2Nom: '',
        parent2Prenom: '',
        signatureDate1: '',
        signatureDate2: ''
      }]
    }
  });

  const { fields: passengerFields, append: appendPassenger, remove: removePassenger } = useFieldArray({
    control,
    name: 'passengers'
  });

  // Récupération des informations existantes des passagers
  const { data: existingPassengers, isLoading: isLoadingPassengers } = useQuery({
    queryKey: ['passengerInfo', flightId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('passenger_info')
        .select('passenger_data')
        .eq('flight_id', flightId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // Code pour "aucun résultat trouvé"
          return null;
        }
        throw error;
      }
      return data?.passenger_data as FormData;
    }
  });

  // Initialiser le formulaire avec les données existantes ou les valeurs par défaut
  React.useEffect(() => {
    if (existingPassengers) {
      // Réinitialiser le formulaire avec les données existantes
      reset(existingPassengers);
      
      // Recalculer l'âge pour chaque passager
      existingPassengers.passengers.forEach((passenger, index) => {
        if (passenger.dateNaissance) {
          handleDateChange(index, passenger.dateNaissance);
        }
      });
    }
  }, [existingPassengers, reset]);

  // Récupération des informations du vol
  const { data: flightData, isLoading: isLoadingFlight } = useQuery({
    queryKey: ['discoveryFlight', flightId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discovery_flights')
        .select('*')
        .eq('id', flightId)
        .single();

      if (error) throw error;
      return data as DiscoveryFlight;
    }
  });

  // Observer les changements du contact d'urgence du premier passager
  React.useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name?.startsWith('passengers.0.contactsUrgence.0') && type === 'change') {
        const firstPassengerContact = value.passengers?.[0]?.contactsUrgence?.[0];
        if (firstPassengerContact && value.passengers && value.passengers.length > 1) {
          // Copier vers les autres passagers
          value.passengers.forEach((_, index) => {
            if (index > 0) {
              setValue(`passengers.${index}.contactsUrgence.0`, firstPassengerContact);
            }
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  // Fonction pour ajouter un nouveau passager
  const handleAddPassenger = () => {
    const firstPassengerContact = watch('passengers.0.contactsUrgence.0');
    appendPassenger({
      nom: '',
      prenom: '',
      dateNaissance: '',
      age: 0,
      poids: 0,
      contactsUrgence: [firstPassengerContact || {}],
      autorisationParentale1: '',
      autorisationParentale2: '',
      parent1Nom: '',
      parent1Prenom: '',
      parent2Nom: '',
      parent2Prenom: '',
      signatureDate1: '',
      signatureDate2: ''
    });
  };

  // Mutation pour sauvegarder les informations
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Vérifier d'abord si un enregistrement existe déjà
      const { data: existingData, error: fetchError } = await supabase
        .from('passenger_info')
        .select('*')
        .eq('flight_id', flightId!)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingData) {
        // Si l'enregistrement existe, faire une mise à jour
        const { error: updateError } = await supabase
          .from('passenger_info')
          .update({ passenger_data: data })
          .eq('flight_id', flightId!);

        if (updateError) throw updateError;
      } else {
        // Si l'enregistrement n'existe pas, faire une insertion
        const { error: insertError } = await supabase
          .from('passenger_info')
          .insert([{
            flight_id: flightId!,
            passenger_data: data
          }]);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast.success('Informations enregistrées avec succès');
      // Rafraîchir les données
      queryClient.invalidateQueries(['passengerInfo', flightId]);
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'enregistrement des informations');
      console.error('Erreur de sauvegarde:', error);
    }
  });

  const handleFileUpload = async (file: File, passengerIndex: number, parentIndex: number) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${flightId}_passenger${passengerIndex}_parent${parentIndex}.${fileExt}`;
      const filePath = `authorizations/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('passenger-authorizations')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('passenger-authorizations')
        .getPublicUrl(filePath);

      setValue(
        `passengers.${passengerIndex}.autorisationParentale${parentIndex}`,
        publicUrl
      );

      toast.success('Document téléchargé avec succès');
      setShowUploadModal(false);
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors du téléchargement du document');
    }
  };

  const openUploadModal = (passengerIndex: number, parentIndex: number) => {
    setCurrentPassengerIndex(passengerIndex);
    setCurrentParentIndex(parentIndex);
    setShowUploadModal(true);
  };

  const handleClearSignature = (passengerIndex: number, parentIndex: number) => {
    const ref = getSignatureRef(passengerIndex, parentIndex);
    if (ref) {
      ref.clear();
    }
    // Toujours effacer les valeurs du formulaire, même si la référence n'existe pas
    setValue(`passengers.${passengerIndex}.autorisationParentale${parentIndex}`, '');
    setValue(`passengers.${passengerIndex}.signatureDate${parentIndex}`, '');
    // Forcer la mise à jour du formulaire
    trigger(`passengers.${passengerIndex}.autorisationParentale${parentIndex}`);
  };

  const handleSaveSignature = (passengerIndex: number, parentIndex: number) => {
    const ref = getSignatureRef(passengerIndex, parentIndex);
    if (ref) {
      const signatureData = ref.toDataURL();
      setValue(`passengers.${passengerIndex}.autorisationParentale${parentIndex}`, signatureData);
      setValue(`passengers.${passengerIndex}.signatureDate${parentIndex}`, new Date().toISOString());
      toast.success('Signature enregistrée');
    }
  };

  const handleDateChange = (index: number, date: string) => {
    if (date) {
      const birthDate = new Date(date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Forcer la mise à jour de l'âge
      setValue(`passengers.${index}.age`, age, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });
      
      // Log pour debug
      console.log('Date de naissance:', date);
      console.log('Age calculé:', age);
      
      // Si l'âge est >= 18, on efface les autorisations parentales
      if (age >= 18) {
        setValue(`passengers.${index}.autorisationParentale1`, '');
        setValue(`passengers.${index}.autorisationParentale2`, '');
        if (getSignatureRef(index, 1)) getSignatureRef(index, 1).clear();
        if (getSignatureRef(index, 2)) getSignatureRef(index, 2).clear();
      }
    } else {
      setValue(`passengers.${index}.age`, 0);
    }
  };

  const onSubmit = (data: FormData) => {
    // Vérifier les autorisations parentales pour les mineurs
    const hasAllRequiredAuthorizations = data.passengers.every(passenger => {
      if (passenger.age < 18) {
        return passenger.autorisationParentale1 && passenger.autorisationParentale2;
      }
      return true;
    });

    if (!hasAllRequiredAuthorizations) {
      toast.error('Les autorisations parentales sont requises pour les passagers mineurs');
      return;
    }

    saveMutation.mutate(data);
  };

  if (isLoadingFlight || isLoadingPassengers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Informations des passagers
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {passengerFields.map((field, passengerIndex) => (
                <div key={field.id} className="border rounded-lg p-6 space-y-6 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800">
                      Passager {passengerIndex + 1}
                    </h2>
                    {passengerIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => removePassenger(passengerIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom
                      </label>
                      <input
                        type="text"
                        {...register(`passengers.${passengerIndex}.nom`)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      {errors.passengers?.[passengerIndex]?.nom && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.passengers[passengerIndex]?.nom?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Prénom
                      </label>
                      <input
                        type="text"
                        {...register(`passengers.${passengerIndex}.prenom`)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      {errors.passengers?.[passengerIndex]?.prenom && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.passengers[passengerIndex]?.prenom?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Date de naissance
                        </label>
                        <input
                          type="date"
                          {...register(`passengers.${passengerIndex}.dateNaissance`)}
                          onChange={(e) => handleDateChange(passengerIndex, e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {errors.passengers?.[passengerIndex]?.dateNaissance && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.passengers[passengerIndex]?.dateNaissance?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Poids (kg)
                        </label>
                        <input
                          type="number"
                          min="20"
                          max="200"
                          step="0.1"
                          {...register(`passengers.${passengerIndex}.poids`, { 
                            valueAsNumber: true,
                            min: { value: 20, message: 'Le poids minimum est de 20 kg' },
                            max: { value: 200, message: 'Le poids maximum est de 200 kg' }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {errors.passengers?.[passengerIndex]?.poids && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.passengers[passengerIndex]?.poids?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Afficher les champs d'autorisation parentale si mineur */}
                  {watch(`passengers.${passengerIndex}.dateNaissance`) && 
                   (watch(`passengers.${passengerIndex}.age`) < 18 || calculateAge(watch(`passengers.${passengerIndex}.dateNaissance`)) < 18) && (
                    <div className="space-y-4 mt-6">
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-yellow-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              Le passager est mineur (âge: {watch(`passengers.${passengerIndex}.age`)} ans), les autorisations parentales sont requises
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Parent 1 */}
                      <div className="bg-white rounded-xl p-4 shadow-sm border space-y-4 mb-4">
                        <h3 className="text-lg font-medium">Autorisation Parentale - Parent 1</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Nom du parent 1</label>
                            <input
                              type="text"
                              {...register(`passengers.${passengerIndex}.parent1Nom`)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Prénom du parent 1</label>
                            <input
                              type="text"
                              {...register(`passengers.${passengerIndex}.parent1Prenom`)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          {watch(`passengers.${passengerIndex}.autorisationParentale1`) ? (
                            <div className="relative">
                              <img 
                                src={watch(`passengers.${passengerIndex}.autorisationParentale1`)} 
                                alt="Signature Parent 1" 
                                className="w-full h-40 object-contain border rounded-xl"
                              />
                              <div className="mt-2 text-sm text-gray-500">
                                Signé le: {new Date(watch(`passengers.${passengerIndex}.signatureDate1`) || '').toLocaleString('fr-FR')}
                              </div>
                              <button 
                                onClick={() => handleClearSignature(passengerIndex, 1)}
                                className="absolute top-2 right-2 p-2 bg-red-100 rounded-full"
                              >
                                <Trash2 className="h-5 w-5 text-red-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="border rounded-xl">
                              <SignatureCanvas
                                ref={(ref) => setSignatureRef(passengerIndex, 1, ref)}
                                canvasProps={{
                                  className: 'w-full h-40 rounded-xl'
                                }}
                              />
                            </div>
                          )}
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleClearSignature(passengerIndex, 1)}
                              className="px-4 py-2 border rounded-lg text-sm"
                            >
                              Effacer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveSignature(passengerIndex, 1)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                            >
                              Sauvegarder
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Parent 2 */}
                      <div className="bg-white rounded-xl p-4 shadow-sm border space-y-4 mb-4">
                        <h3 className="text-lg font-medium">Autorisation Parentale - Parent 2</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Nom du parent 2</label>
                            <input
                              type="text"
                              {...register(`passengers.${passengerIndex}.parent2Nom`)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Prénom du parent 2</label>
                            <input
                              type="text"
                              {...register(`passengers.${passengerIndex}.parent2Prenom`)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          {watch(`passengers.${passengerIndex}.autorisationParentale2`) ? (
                            <div className="relative">
                              <img 
                                src={watch(`passengers.${passengerIndex}.autorisationParentale2`)} 
                                alt="Signature Parent 2" 
                                className="w-full h-40 object-contain border rounded-xl"
                              />
                              <div className="mt-2 text-sm text-gray-500">
                                Signé le: {new Date(watch(`passengers.${passengerIndex}.signatureDate2`) || '').toLocaleString('fr-FR')}
                              </div>
                              <button 
                                onClick={() => handleClearSignature(passengerIndex, 2)}
                                className="absolute top-2 right-2 p-2 bg-red-100 rounded-full"
                              >
                                <Trash2 className="h-5 w-5 text-red-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="border rounded-xl">
                              <SignatureCanvas
                                ref={(ref) => setSignatureRef(passengerIndex, 2, ref)}
                                canvasProps={{
                                  className: 'w-full h-40 rounded-xl'
                                }}
                              />
                            </div>
                          )}
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleClearSignature(passengerIndex, 2)}
                              className="px-4 py-2 border rounded-lg text-sm"
                            >
                              Effacer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveSignature(passengerIndex, 2)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                            >
                              Sauvegarder
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Contact d'urgence
                      {passengerIndex > 0 && (
                        <span className="ml-2 text-sm text-gray-500">
                          (Pré-rempli avec les informations du premier passager)
                        </span>
                      )}
                    </h3>
                    {field.contactsUrgence?.map((contact: any, contactIndex: number) => (
                      <div key={contactIndex} className="border rounded p-4 bg-white">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Nom
                            </label>
                            <input
                              type="text"
                              {...register(`passengers.${passengerIndex}.contactsUrgence.${contactIndex}.nom`)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            {errors.passengers?.[passengerIndex]?.contactsUrgence?.[contactIndex]?.nom && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.passengers[passengerIndex]?.contactsUrgence?.[contactIndex]?.nom?.message}
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Téléphone
                            </label>
                            <input
                              type="tel"
                              {...register(`passengers.${passengerIndex}.contactsUrgence.${contactIndex}.telephone`)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            {errors.passengers?.[passengerIndex]?.contactsUrgence?.[contactIndex]?.telephone && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.passengers[passengerIndex]?.contactsUrgence?.[contactIndex]?.telephone?.message}
                              </p>
                            )}
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Adresse
                            </label>
                            <input
                              type="text"
                              {...register(`passengers.${passengerIndex}.contactsUrgence.${contactIndex}.adresse`)}
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            {errors.passengers?.[passengerIndex]?.contactsUrgence?.[contactIndex]?.adresse && (
                              <p className="mt-1 text-sm text-red-600">
                                {errors.passengers[passengerIndex]?.contactsUrgence?.[contactIndex]?.adresse?.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddPassenger}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Ajouter un passager
                </button>

                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={saveMutation.isLoading}
                >
                  {saveMutation.isLoading ? 'Enregistrement...' : 'Enregistrer les informations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal pour l'upload des fichiers */}
      {showUploadModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Upload de l'autorisation parentale
                  </h3>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, currentPassengerIndex, currentParentIndex);
                        }
                      }}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                  onClick={() => setShowUploadModal(false)}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerInfoForm;
