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

interface OurFleetProps {
  clubCode?: string;
}

const OurFleet: React.FC<OurFleetProps> = ({ clubCode: propClubCode }) => {
  const { clubCode: urlClubCode } = useParams<{ clubCode: string }>();
  const effectiveClubCode = propClubCode || urlClubCode;

  console.log('OurFleet - Prop Club Code:', propClubCode);
  console.log('OurFleet - URL Club Code:', urlClubCode);
  console.log('OurFleet - Effective Club Code:', effectiveClubCode);

  // Récupérer l'ID du club à partir de son code
  const { data: club } = useQuery({
    queryKey: ['club', effectiveClubCode],
    queryFn: async () => {
      if (!effectiveClubCode) throw new Error('Club code is required');
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('code', effectiveClubCode.toUpperCase())
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveClubCode,
  });

  // Récupérer les paramètres du site avec la flotte en cache
  const { data: settings, isLoading } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', club?.id],
    queryFn: async () => {
      if (!club?.id) throw new Error('Club ID is required');
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('cached_fleet, logo_url, carousel_images')
        .eq('club_id', club.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!club?.id,
  });

  if (isLoading || !settings?.cached_fleet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <PageLayout
      clubCode={effectiveClubCode || ''}
      clubName={club?.name}
      logoUrl={settings?.logo_url}
      title="Notre Flotte"
      description="Découvrez nos avions disponibles pour la formation et les vols"
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
