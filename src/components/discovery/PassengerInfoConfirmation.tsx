import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PassengerInfoConfirmation: React.FC = () => {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();

  const { data: passengerInfo, isLoading } = useQuery({
    queryKey: ['passengerInfo', flightId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('passenger_info')
        .select('*')
        .eq('flight_id', flightId)
        .single();

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
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
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Récapitulatif des informations passagers
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Veuillez vérifier les informations avant de procéder au paiement
              </p>
            </div>

            {passengerInfo?.passenger_data.passengers.map((passenger: any, index: number) => (
              <div key={index} className="mb-8 border rounded-lg p-6 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Passager {index + 1}
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom</label>
                    <p className="mt-1 text-sm text-gray-900">{passenger.nom}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prénom</label>
                    <p className="mt-1 text-sm text-gray-900">{passenger.prenom}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date de naissance</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(passenger.dateNaissance), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>

                  {passenger.age < 18 && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-orange-600">
                        Autorisations parentales fournies
                      </label>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-900">✓ Parent 1</p>
                        <p className="text-sm text-gray-900">✓ Parent 2</p>
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 mt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Contacts d'urgence</h3>
                    {passenger.contactsUrgence.map((contact: any, contactIndex: number) => (
                      <div key={contactIndex} className="border rounded p-4 bg-white mb-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Nom</label>
                            <p className="mt-1 text-sm text-gray-900">{contact.nom}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                            <p className="mt-1 text-sm text-gray-900">{contact.telephone}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Adresse</label>
                            <p className="mt-1 text-sm text-gray-900">{contact.adresse}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => navigate(`/discovery-flights/${flightId}/passenger-info`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Modifier les informations
              </button>

              <button
                type="button"
                onClick={() => navigate(`/discovery-flights/${flightId}/payment`)}
                className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Procéder au paiement
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassengerInfoConfirmation;
