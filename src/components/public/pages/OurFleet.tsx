import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { PageLayout } from '../layout/PageLayout';

interface WebsiteSettings {
  cached_fleet: {
    id: string;
    name: string;
    registration: string;
    type: string;
    description: string | null;
    image_url: string | null;
    hourly_rate: number;
  }[];
  logo_url?: string | null;
  carousel_images?: string[];
}

const OurFleet: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();

  // Récupérer l'ID du club à partir de son code
  const { data: club } = useQuery({
    queryKey: ['club', clubCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name')
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
        .select('cached_fleet, logo_url, carousel_images')
        .eq('club_id', club?.id)
        .single();

      if (error) throw error;
      return data || {
        cached_fleet: [],
        logo_url: null,
        carousel_images: []
      };
    },
    enabled: !!club?.id,
  });

  // Récupérer les pages du club
  const { data: pages } = useQuery({
    queryKey: ['clubPages', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_pages')
        .select('title, slug')
        .eq('club_id', club?.id)
        .order('title');

      if (error) throw error;
      return data || [];
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
    <PageLayout
      clubCode={clubCode || ''}
      clubName={club?.name}
      logoUrl={settings?.logo_url}
      pages={pages}
      title="Notre Flotte"
      description="Découvrez notre flotte d'aéronefs, soigneusement entretenue et régulièrement mise à jour pour assurer votre sécurité et votre confort lors de vos vols."
      backgroundImage={settings?.carousel_images?.[0]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(settings?.cached_fleet || []).map((plane, index) => (
          <motion.div
            key={plane.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-lg overflow-hidden"
          >
            <div className="aspect-w-16 aspect-h-9">
              {plane.image_url ? (
                <img
                  src={plane.image_url}
                  alt={`${plane.registration}`}
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
                <h3 className="text-xl font-semibold text-gray-900">
                  {plane.name}
                </h3>
                <span className="text-sm font-medium text-gray-500">
                  {plane.registration}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{plane.type}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-blue-600">
                  {(plane.hourly_rate || 0).toLocaleString('fr-FR')} € / heure
                </span>
              </div>
              
              {plane.description && (
                <p className="text-gray-700 text-sm mt-4">
                  {plane.description}
                </p>
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
    </PageLayout>
  );
};

export default OurFleet;
