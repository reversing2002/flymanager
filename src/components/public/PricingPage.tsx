import React from 'react';
import { motion } from 'framer-motion';
import { 
  Rocket as RocketIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Feature {
  text: string;
  icon?: React.ReactNode;
  highlight?: boolean;
  description?: string;
  hours?: string;
  price?: string;
}

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  
  const features: Feature[] = [
    {
      text: 'Démarrage',
      icon: <RocketIcon className="h-8 w-8 text-green-400" />,
      highlight: true,
      description: 'Commencez votre aventure avec 4fly gratuitement et découvrez tous les outils pour faire décoller votre club',
      hours: 'Jusqu\'à 1000h/an',
      price: 'Gratuit'
    },
    {
      text: 'Croissance',
      icon: <TrendingUpIcon className="h-8 w-8 text-blue-400" />,
      description: 'Votre club se développe ? 4fly évolue avec vous pour soutenir votre croissance',
      hours: '1000h à 3000h/an',
      price: '0,50€/h de vol'
    },
    {
      text: 'Performance',
      icon: <SpeedIcon className="h-8 w-8 text-purple-400" />,
      description: 'Profitez d\'un accompagnement personnalisé pour optimiser la gestion de votre activité',
      hours: '3000h+/an',
      price: 'Sur mesure'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d21] to-[#2d3139] py-16 px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              Évoluez avec 4fly
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-3 text-xl text-gray-300 sm:mt-5 sm:mx-auto md:mt-5"
            >
              Une solution qui s'adapte à la croissance de votre club
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mt-16 relative"
          >
            <div className="absolute left-0 right-0 h-1 top-24 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 transform -skew-y-3"></div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className={`relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 
                    ${feature.highlight ? 'ring-2 ring-green-500 bg-white/15' : ''}`}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-[#1a1d21] p-3 rounded-full">
                    {feature.icon}
                  </div>
                  
                  <div className="mt-8 text-center">
                    <h3 className={`text-2xl font-bold ${feature.highlight ? 'text-green-400' : 'text-white'}`}>
                      {feature.text}
                    </h3>
                    <div className="mt-2 text-gray-400 text-sm">{feature.hours}</div>
                    <div className="mt-1 text-xl font-bold text-white">{feature.price}</div>
                    <p className="mt-4 text-gray-300 text-sm">
                      {feature.description}
                    </p>
                  </div>

                  {feature.highlight && (
                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                      onClick={() => navigate('/create-club')}
                      className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white py-3 px-6 rounded-lg font-semibold"
                    >
                      Commencer gratuitement
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-gray-400 mb-8">
                Toutes les fonctionnalités sont disponibles dès le début : réservations, 
                plannings, maintenance, formations, facturation... <br/>
                Plus vous volez, plus votre club grandit, plus 4fly vous accompagne !
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
