import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { PageLayout } from '../layout/PageLayout';

interface Aircraft {
  id: string;
  name: string;
  type: string;
  registration: string;
  image_url: string | null;
  hourly_rate: number;
  description: string | null;
}

interface DiscoveryFlightFeature {
  id: string;
  description: string;
  display_order: number;
}

interface DiscoveryFlight {
  id: string;
  price: number;
  duration: number;
  features: DiscoveryFlightFeature[];
}

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  image_url: string | null;
  instructor_rate: number | null;
}

interface WebsiteSettings {
  logo_url?: string | null;
  carousel_images?: string[];
  cached_fleet: Aircraft[];
  cached_discovery_flights: DiscoveryFlight[];
  cached_instructors: Instructor[];
}

const Pricing: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();

  // Récupérer les informations du club
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

  // Récupérer les paramètres du site et la flotte
  const { data: settings } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('logo_url, carousel_images, cached_fleet, cached_discovery_flights, cached_instructors')
        .eq('club_id', club?.id)
        .single();

      if (error) throw error;
      return data || {
        logo_url: null,
        carousel_images: [],
        cached_fleet: [],
        cached_discovery_flights: [],
        cached_instructors: []
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

  if (!settings) {
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
      title="Tarifs"
      description="Découvrez nos tarifs pour les vols découverte, les heures de vol et l'instruction."
      backgroundImage={settings?.carousel_images?.[0]}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Vols découverte */}
        {settings.cached_discovery_flights && settings.cached_discovery_flights.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Vols découverte</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {settings.cached_discovery_flights.map((flight) => (
                <motion.div
                  key={flight.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">Vol découverte {flight.duration} minutes</h3>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {flight.price} €
                      </div>
                    </div>
                    {flight.features && flight.features.length > 0 && (
                      <ul className="mt-4 space-y-3">
                        {flight.features
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((feature) => (
                            <li key={feature.id} className="flex items-start text-gray-600">
                              <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{feature.description}</span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Heures de vol */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold mb-6 text-gray-900">Heures de vol</h2>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {settings.cached_fleet.map((aircraft) => (
                <motion.div
                  key={aircraft.id}
                  whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
                  className="flex flex-col md:flex-row md:justify-between md:items-center p-6 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{aircraft.name}</h3>
                    {aircraft.registration && (
                      <p className="text-gray-600 text-sm">{aircraft.registration}</p>
                    )}
                    {aircraft.description && (
                      <p className="text-gray-600 mt-2">{aircraft.description}</p>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-blue-600 md:ml-8">
                    {aircraft.hourly_rate} €<span className="text-sm text-gray-500 font-normal">/heure</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Instruction */}
        {settings.cached_instructors && settings.cached_instructors.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Instruction</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="divide-y divide-gray-100">
                {Object.entries(
                  settings.cached_instructors
                    .filter(instructor => instructor.instructor_rate && instructor.instructor_rate > 0)
                    .reduce((acc, instructor) => {
                      const rate = instructor.instructor_rate!;
                      if (!acc[rate]) {
                        acc[rate] = [];
                      }
                      acc[rate].push(instructor);
                      return acc;
                    }, {} as Record<number, Instructor[]>)
                )
                  .sort(([rateA], [rateB]) => Number(rateA) - Number(rateB))
                  .map(([rate, instructors]) => (
                    <motion.div
                      key={rate}
                      whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
                      className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <div className="flex flex-wrap gap-4 items-center mb-4 md:mb-0">
                        {instructors.map((instructor) => (
                          <div key={instructor.id} className="flex items-center">
                            {instructor.image_url ? (
                              <img
                                src={instructor.image_url}
                                alt={`${instructor.first_name} ${instructor.last_name}`}
                                className="w-16 h-16 rounded-full object-cover mr-4 border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mr-4 border-2 border-gray-200">
                                <span className="text-blue-600 text-xl font-semibold">
                                  {instructor.first_name[0]}
                                  {instructor.last_name[0]}
                                </span>
                              </div>
                            )}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {instructor.first_name} {instructor.last_name}
                              </h3>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="text-2xl font-bold text-blue-600 md:ml-8 whitespace-nowrap">
                        + {Number(rate).toFixed(2)} €<span className="text-sm text-gray-500 font-normal">/heure</span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </PageLayout>
  );
};

export default Pricing;
