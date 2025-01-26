import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { UserCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { PageLayout } from '../layout/PageLayout';

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  image_url: string | null;
  qualifications: string[];
  specialties: string[];
  instructor_rate: number | null;
}

interface WebsiteSettings {
  logo_url?: string | null;
  carousel_images?: string[];
  cached_instructors: Instructor[];
}

const Training: React.FC = () => {
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

  // Récupérer les paramètres du site
  const { data: settings, isLoading } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('logo_url, carousel_images, cached_instructors')
        .eq('club_id', club?.id)
        .single();

      if (error) throw error;
      return data || {
        logo_url: null,
        carousel_images: [],
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
      pages={pages}
      title="Formation"
      description="Découvrez nos formations et rencontrez nos instructeurs qualifiés qui vous accompagneront dans votre apprentissage du pilotage."
      backgroundImage={settings?.carousel_images?.[0]}
    >
      {/* Section Formations */}
      <section className="mb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Nos Formations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Formation PPL</h3>
              <p className="text-gray-600 mb-4">
                La licence de pilote privé (PPL) est la première étape pour devenir pilote. 
                Cette formation vous permettra d'acquérir toutes les compétences nécessaires 
                pour piloter en toute sécurité.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>45 heures de formation minimum</li>
                <li>Formation théorique complète</li>
                <li>Vols en double commande et en solo</li>
                <li>Préparation à l'examen</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Perfectionnement</h3>
              <p className="text-gray-600 mb-4">
                Pour les pilotes déjà licenciés, nous proposons des formations 
                complémentaires pour améliorer vos compétences.
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Vol de nuit</li>
                <li>Qualification montagne</li>
                <li>Navigation avancée</li>
                <li>Perfectionnement sécurité</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Section Instructeurs */}
      {settings.cached_instructors?.length > 0 && (
        <section>
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Nos Instructeurs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {settings.cached_instructors
                .filter(instructor => instructor.instructor_rate && instructor.instructor_rate > 0)
                .map((instructor, index) => (
                <motion.div
                  key={instructor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="aspect-w-1 aspect-h-1 bg-gray-50">
                    {instructor.image_url ? (
                      <img
                        src={instructor.image_url}
                        alt={`${instructor.first_name} ${instructor.last_name}`}
                        className="w-32 h-32 rounded-full object-cover mx-auto mb-4"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                        <span className="text-blue-600 text-3xl font-semibold">
                          {instructor.first_name[0]}
                          {instructor.last_name[0]}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2 text-center">
                      {instructor.first_name} {instructor.last_name}
                    </h3>
                    
                    {instructor.qualifications && instructor.qualifications.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Qualifications</h4>
                        <div className="flex flex-wrap gap-2">
                          {instructor.qualifications.map((qual, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full"
                            >
                              {qual}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {instructor.specialties && instructor.specialties.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-2">Spécialités</h4>
                        <div className="flex flex-wrap gap-2">
                          {instructor.specialties.map((spec, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-3 py-1 bg-green-50 text-green-600 text-sm rounded-full"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {instructor.bio && (
                      <p className="text-gray-600 mt-4">
                        {instructor.bio}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </PageLayout>
  );
};

export default Training;
