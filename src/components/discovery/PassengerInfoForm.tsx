import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { EmergencyContact, PassengerInfo, DiscoveryFlight } from '../../types/discovery';
import { Plus, Trash2, Upload } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

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
  contactsUrgence: z.array(emergencyContactSchema).min(1, 'Au moins un contact d\'urgence est requis'),
  autorisationParentale1: z.string().optional(),
  autorisationParentale2: z.string().optional(),
});

const formSchema = z.object({
  passengers: z.array(passengerSchema).min(1, 'Au moins un passager est requis'),
});

type FormData = {
  passengers: (PassengerInfo & {
    age: number;
    autorisationParentale1?: string;
    autorisationParentale2?: string;
  })[];
};

export const PassengerInfoForm: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = React.useState(false);
  const [currentPassengerIndex, setCurrentPassengerIndex] = React.useState<number>(0);
  const [currentParentIndex, setCurrentParentIndex] = React.useState<number>(1);
  const [signatureRef1, setSignatureRef1] = React.useState<SignatureCanvas | null>(null);
  const [signatureRef2, setSignatureRef2] = React.useState<SignatureCanvas | null>(null);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengers: [{ 
        nom: '',
        prenom: '',
        dateNaissance: '',
        age: 0,
        contactsUrgence: [{}],
        autorisationParentale1: '',
        autorisationParentale2: ''
      }]
    }
  });

  const { fields: passengerFields, append: appendPassenger, remove: removePassenger } = useFieldArray({
    control,
    name: 'passengers'
  });

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

  // Mutation pour sauvegarder les informations
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const { error } = await supabase
        .from('passenger_info')
        .insert([{
          flight_id: flightId!,
          passenger_data: data
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Informations enregistrées avec succès');
      navigate(`/discovery-flights/${flightId}/passenger-confirmation`);
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'enregistrement des informations');
      console.error(error);
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

  const handleClearSignature = (index: number) => {
    const ref = index === 1 ? signatureRef1 : signatureRef2;
    if (ref) {
      ref.clear();
      setValue(`passengers.${currentPassengerIndex}.autorisationParentale${index}`, '');
    }
  };

  const handleSaveSignature = (index: number) => {
    const ref = index === 1 ? signatureRef1 : signatureRef2;
    if (ref) {
      const signatureData = ref.toDataURL();
      setValue(`passengers.${currentPassengerIndex}.autorisationParentale${index}`, signatureData);
      toast.success('Signature enregistrée');
    }
  };

  if (isLoadingFlight) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDateChange = (index: number, value: string) => {
    const age = calculateAge(value);
    setValue(`passengers.${index}.age`, age);
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
                  </div>

                  {/* Afficher les champs d'autorisation parentale si mineur */}
                  {watch(`passengers.${passengerIndex}.age`) < 18 && (
                    <div className="mt-6 space-y-4 border-t border-gray-200 pt-4">
                      <p className="text-sm font-medium text-orange-600">
                        Le passager est mineur, les autorisations parentales sont requises
                      </p>
                      
                      <div className="bg-white rounded-xl p-4 shadow-sm border space-y-4 mb-4">
                        <h3 className="text-lg font-medium">Autorisation Parentale - Parent 1</h3>
                        <div className="space-y-4">
                          {watch(`passengers.${passengerIndex}.autorisationParentale1`) ? (
                            <div className="relative">
                              <img 
                                src={watch(`passengers.${passengerIndex}.autorisationParentale1`)} 
                                alt="Signature Parent 1" 
                                className="w-full h-40 object-contain border rounded-xl"
                              />
                              <button 
                                onClick={() => handleClearSignature(1)}
                                className="absolute top-2 right-2 p-2 bg-red-100 rounded-full"
                              >
                                <Trash2 className="h-5 w-5 text-red-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="border rounded-xl">
                              <SignatureCanvas
                                ref={(ref) => setSignatureRef1(ref)}
                                canvasProps={{
                                  className: 'w-full h-40 rounded-xl'
                                }}
                              />
                            </div>
                          )}
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleClearSignature(1)}
                              className="px-4 py-2 border rounded-lg text-sm"
                            >
                              Effacer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveSignature(1)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                            >
                              Sauvegarder
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 shadow-sm border space-y-4 mb-4">
                        <h3 className="text-lg font-medium">Autorisation Parentale - Parent 2</h3>
                        <div className="space-y-4">
                          {watch(`passengers.${passengerIndex}.autorisationParentale2`) ? (
                            <div className="relative">
                              <img 
                                src={watch(`passengers.${passengerIndex}.autorisationParentale2`)} 
                                alt="Signature Parent 2" 
                                className="w-full h-40 object-contain border rounded-xl"
                              />
                              <button 
                                onClick={() => handleClearSignature(2)}
                                className="absolute top-2 right-2 p-2 bg-red-100 rounded-full"
                              >
                                <Trash2 className="h-5 w-5 text-red-500" />
                              </button>
                            </div>
                          ) : (
                            <div className="border rounded-xl">
                              <SignatureCanvas
                                ref={(ref) => setSignatureRef2(ref)}
                                canvasProps={{
                                  className: 'w-full h-40 rounded-xl'
                                }}
                              />
                            </div>
                          )}
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleClearSignature(2)}
                              className="px-4 py-2 border rounded-lg text-sm"
                            >
                              Effacer
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveSignature(2)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                            >
                              Sauvegarder
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Contacts d'urgence
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
                  onClick={() => appendPassenger({ 
                    nom: '',
                    prenom: '',
                    dateNaissance: '',
                    age: 0,
                    contactsUrgence: [{}],
                    autorisationParentale1: '',
                    autorisationParentale2: ''
                  })}
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
