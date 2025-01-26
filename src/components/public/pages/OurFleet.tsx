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
  const { clubCode } = useParams();

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
  const { data: settings } = useQuery<WebsiteSettings>({
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

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-[400px] bg-gray-900">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-900/60" />
        <div className="absolute inset-0">
          {settings?.cached_fleet[0]?.image_url && (
            <img
              src={settings.cached_fleet[0].image_url}
              alt="Notre flotte"
              className="w-full h-full object-cover opacity-50"
            />
          )}
        </div>
        <div className="relative h-full flex flex-col items-center justify-center text-center text-white p-4">
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-wider mb-4">
            Notre Flotte
          </h1>
          <p className="text-xl max-w-2xl mx-auto">
            Découvrez notre flotte d'avions modernes et bien entretenus, prêts à vous accompagner dans vos aventures aériennes
          </p>
        </div>
      </div>

      {/* Introduction */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="prose prose-lg mx-auto">
          <p>
            Notre aéroclub dispose d'une flotte diversifiée d'appareils, soigneusement sélectionnés pour répondre 
            aux besoins de nos membres, qu'ils soient en formation ou pilotes confirmés.
          </p>
          <p>
            Chaque avion est maintenu selon les plus hauts standards de sécurité et fait l'objet d'une maintenance 
            régulière par notre équipe de mécaniciens qualifiés.
          </p>
        </div>
      </div>

      {/* Liste des avions */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {settings?.cached_fleet.map((aircraft) => (
              <motion.div
                key={aircraft.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="aspect-w-16 aspect-h-9">
                  {aircraft.image_url ? (
                    <img 
                      src={aircraft.image_url} 
                      alt={aircraft.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400">Photo non disponible</span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold">{aircraft.name}</h3>
                    <span className="text-sm font-medium text-gray-500">{aircraft.registration}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{aircraft.type}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-semibold text-blue-600">
                      {aircraft.hour_rate.toLocaleString('fr-FR')} € / heure
                    </span>
                  </div>
                  {aircraft.description && (
                    <p className="text-gray-600 mt-4">
                      {aircraft.description}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Section Contact */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Envie de voler ?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Contactez-nous pour en savoir plus sur nos avions et nos formations.
          </p>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors">
            Nous contacter
          </button>
        </div>
      </div>
    </div>
  );
};

export default OurFleet;
