import React from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket as RocketIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Feature {
  text: string;
  highlight?: boolean;
}

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  
  const features: Feature[] = [
    { text: 'Gestion des réservations et plannings', highlight: true },
    { text: 'Gestion des membres', highlight: true },
    { text: 'Suivi de la flotte et des potentiels', highlight: true },
    { text: 'Suivi des cotisations, qualifications et licences', highlight: true },
    { text: 'Statistiques membres et heures de vols', highlight: true },
    { text: 'Tableau de bords personnalisés', highlight: true },
    { text: 'Gestion de la documentation du club', highlight: true },
    { text: 'Messagerie interne', highlight: true },
    { text: 'Alertes e-mails et mailing groupé', highlight: true },
    { text: 'Acceptez les paiements par CB (3% de commission)', highlight: true },
    { text: 'Gestions des comptes pilotes', highlight: true },
    { text: 'Météo aéronautique et balises de vent locales', highlight: true }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d21] to-[#2d3139] py-16 px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              Commencez gratuitement
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-3 text-xl text-gray-300 sm:mt-5 sm:max-w-xl sm:mx-auto md:mt-5"
            >
              Gérez votre club aérien avec tous les outils essentiels, sans engagement
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-16 mx-auto max-w-3xl rounded-2xl bg-white/10 backdrop-blur-lg p-8 sm:p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-[140px] w-[140px] bg-gradient-to-br from-blue-500 to-purple-600 blur-3xl opacity-30 rounded-full"></div>
            
            <div className="flex items-center justify-between flex-col sm:flex-row">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-500 bg-opacity-10">
                    <RocketIcon className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                <div className="ml-5">
                  <h3 className="text-2xl font-bold text-white">Pack Découverte</h3>
                  <p className="text-gray-300 mt-1">Parfait pour démarrer</p>
                </div>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="text-5xl font-bold text-white">0€</div>
                <p className="text-sm text-gray-400 mt-1">Sans engagement</p>
              </div>
            </div>

            <div className="mt-10 grid gap-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`flex items-center ${feature.highlight ? 'text-white' : 'text-gray-300'}`}
                >
                  <CheckCircleIcon className={`h-5 w-5 mr-3 ${feature.highlight ? 'text-blue-400' : 'text-gray-500'}`} />
                  <span>{feature.text}</span>
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="mt-10"
            >
              <button
                onClick={() => navigate('/create-club')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-lg"
              >
                Commencer gratuitement
              </button>
              <p className="text-sm text-gray-400 text-center mt-4">
                Pas de carte bancaire requise
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
