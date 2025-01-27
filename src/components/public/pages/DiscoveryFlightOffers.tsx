import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../layout/PageLayout';

interface DiscoveryFlightPrice {
  id: string;
  club_id: string;
  price: number;
  duration: number;
  features: {
    id: string;
    description: string;
    display_order: number;
  }[];
}

interface DiscoveryFlightOffersProps {
  clubCode: string;
}

export const DiscoveryFlightOffers: React.FC<DiscoveryFlightOffersProps> = ({ clubCode }) => {
  const navigate = useNavigate();

  // Récupération des informations du club
  const { data: club } = useQuery({
    queryKey: ['club', clubCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('code', clubCode.toUpperCase())
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubCode,
  });

  // Récupération des formules de vol découverte
  const { data: discoveryFlightPrices } = useQuery({
    queryKey: ['discoveryFlightPrices', club?.id],
    queryFn: async () => {
      if (!club?.id) return null;
      
      const { data: pricesData, error: pricesError } = await supabase
        .from('discovery_flight_prices')
        .select(`
          id,
          club_id,
          price,
          duration
        `)
        .eq('club_id', club.id)
        .order('price');

      if (pricesError) throw pricesError;

      const pricesWithFeatures = await Promise.all((pricesData || []).map(async (price) => {
        const { data: featureData, error: featureError } = await supabase
          .from('discovery_flight_price_features')
          .select(`
            discovery_flight_features (
              id,
              description,
              display_order
            )
          `)
          .eq('price_id', price.id)
          .order('discovery_flight_features (display_order)');

        if (featureError) throw featureError;

        return {
          ...price,
          features: featureData?.map(item => item.discovery_flight_features) || []
        };
      }));

      return pricesWithFeatures;
    },
    enabled: !!club?.id,
  });

  const handleSelectFormula = (formulaId: string) => {
    navigate(`/discovery/new?club=${club?.id}&formula=${formulaId}`);
  };

  return (
    <PageLayout
      clubCode={clubCode}
      clubName={club?.name}
      logoUrl={club?.logo_url}
      title="Vols découverte"
      description="Offrez-vous une expérience inoubliable aux commandes d'un avion avec nos formules de vol découverte"
      backgroundImage="/images/discovery-flight-bg.jpg"
    >
      {/* Grille des formules */}
      <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-3 lg:gap-12">
        {discoveryFlightPrices?.map((formula) => (
          <motion.div
            key={formula.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* En-tête de la formule */}
            <div className="p-8 bg-gradient-to-br from-sky-500 to-sky-600 text-white">
              <div className="text-center">
                <h3 className="text-2xl font-semibold mb-2">
                  Vol découverte {formula.duration} min
                </h3>
                <p className="text-4xl font-bold">
                  {formula.price}€
                </p>
              </div>
            </div>

            {/* Caractéristiques */}
            <div className="p-8">
              <ul className="space-y-4">
                {formula.features.map((feature) => (
                  <li key={feature.id} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-sky-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">{feature.description}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectFormula(formula.id)}
                className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
              >
                Réserver maintenant
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </PageLayout>
  );
};

export default DiscoveryFlightOffers;
