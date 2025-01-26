import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';

interface WebsiteSettings {
  cached_fleet: {
    id: string;
    name: string;
    registration: string;
    type: string;
    description: string | null;
    image_url: string | null;
    hour_rate: number;
  }[];
}

const OurFleet: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();

  // Récupérer l'ID du club à partir de son code
  const { data: club } = useQuery({
    queryKey: ['club', clubCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id')
        .ilike('code', clubCode || '')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubCode,
  });

  // Récupérer les paramètres du site avec la flotte en cache
  const { data: settings, isLoading } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('cached_fleet')
        .eq('club_id', club?.id)
        .single();

      if (error) throw error;
      return data || {
        cached_fleet: []
      };
    },
    enabled: !!club?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Notre Flotte</h1>
        <p className="text-lg text-gray-600">
          Découvrez notre flotte d'aéronefs, soigneusement entretenue et régulièrement mise à jour 
          pour assurer votre sécurité et votre confort lors de vos vols.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settings?.cached_fleet.map((plane, index) => (
          <motion.div
            key={plane.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden"
          >
            {plane.image_url && (
              <div className="relative h-48 bg-gray-200">
                <img
                  src={plane.image_url}
                  alt={`${plane.registration}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {plane.name}
              </h3>
              <p className="text-gray-500 text-sm mb-2">{plane.registration}</p>
              <p className="text-gray-600 mb-4">{plane.type}</p>
              
              {plane.description && (
                <p className="text-gray-700 text-sm mt-4">
                  {plane.description}
                </p>
              )}
              
              {typeof plane.hour_rate === 'number' && (
                <div className="mt-4 inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  {plane.hour_rate.toLocaleString('fr-FR')} € / heure
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {(!settings?.cached_fleet || settings.cached_fleet.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            Aucun avion n'est actuellement disponible dans la flotte.
          </p>
        </div>
      )}
    </div>
  );
};

export default OurFleet;
