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
  qualifications: string[];
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

  // Récupérer les paramètres du site avec les tarifs en cache
  const { data: settings, isLoading } = useQuery<WebsiteSettings>({
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

  if (isLoading || !settings) {
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
      title="Tarifs"
      description="Découvrez nos tarifs pour la formation, la location d'avions et l'adhésion au club."
      backgroundImage={settings?.carousel_images?.[0]}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Vols découverte */}
        {settings.cached_discovery_flights?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
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
        {settings.cached_fleet?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Heures de vol</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="divide-y divide-gray-100">
                {settings.cached_fleet.map((aircraft) => (
                  <motion.div
                    key={aircraft.id}
                    whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
                    className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between"
                  >
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {aircraft.registration} - {aircraft.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{aircraft.type}</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-blue-600">{aircraft.hourly_rate}€</span>
                        <span className="ml-1 text-gray-500">/heure</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Instruction */}
        {settings.cached_instructors?.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Instruction</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="divide-y divide-gray-100">
                {settings.cached_instructors
                  .filter(instructor => instructor.instructor_rate && instructor.instructor_rate > 0)
                  .map((instructor) => (
                    <motion.div
                      key={instructor.id}
                      whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
                      className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {instructor.first_name} {instructor.last_name}
                        </h3>
                        {instructor.qualifications && instructor.qualifications.length > 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            {instructor.qualifications.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 md:mt-0">
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-blue-600">
                            {instructor.instructor_rate}€
                          </span>
                          <span className="ml-1 text-gray-500">/heure</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Note importante */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 rounded-xl p-6 mt-8"
        >
          <p className="text-sm text-blue-800">
            * Les tarifs indiqués sont susceptibles d'être modifiés. Contactez-nous pour obtenir les tarifs les plus à jour.
          </p>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default Pricing;
