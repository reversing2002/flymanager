import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import PaymentsIcon from '@mui/icons-material/Payments';
import GroupIcon from '@mui/icons-material/Group';
import AviationImage from '../common/AviationImage';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const features = [
  {
    icon: <FlightTakeoffIcon className="h-6 w-6" />,
    title: 'Gestion des Vols',
    description: 'Planification et suivi des vols en temps réel'
  },
  {
    icon: <ScheduleIcon className="h-6 w-6" />,
    title: 'Réservations',
    description: 'Système de réservation en ligne 24/7'
  },
  {
    icon: <BuildIcon className="h-6 w-6" />,
    title: 'Maintenance',
    description: 'Suivi de maintenance et alertes automatiques'
  },
  {
    icon: <SchoolIcon className="h-6 w-6" />,
    title: 'Formation',
    description: 'Gestion complète de la formation des élèves'
  },
  {
    icon: <PaymentsIcon className="h-6 w-6" />,
    title: 'Paiements',
    description: 'Gestion simplifiée des paiements et factures'
  },
  {
    icon: <GroupIcon className="h-6 w-6" />,
    title: 'Gestion des Membres',
    description: 'Administration efficace des membres du club'
  }
];

const HomePage = () => {
  const backgroundImages = [
    'login-1.png',
    'login-2.png',
    'login-3.png',
    'login-4.png',
    'login-5.png',
    'login-6.png',
    'login-7.png',
    'login-8.png',
    'login-9.png',
    'login-10.png',
    'login-11.png',
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(() => 
    Math.floor(Math.random() * backgroundImages.length)
  );

  const getRandomIndex = (currentIndex: number) => {
    const newIndex = Math.floor(Math.random() * (backgroundImages.length - 1));
    // Éviter de répéter la même image
    return newIndex >= currentIndex ? newIndex + 1 : newIndex;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex(prevIndex => getRandomIndex(prevIndex));
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0"
          >
            <AviationImage
              imageName={backgroundImages[currentImageIndex]}
              className="w-full h-full object-cover brightness-[0.6] contrast-[1.2]"
              showPrompt={process.env.NODE_ENV === 'development'}
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#1a1d21]" />
      </div>

      {/* Content */}
      <div className="relative min-h-screen">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          {/* Hero Section avec CTA principal */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-8 drop-shadow-2xl">
              Gérez votre aéroclub{' '}
              <span className="text-blue-400 bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">simplement</span>
              </h1>
            <p className="text-xl text-gray-100 mb-12 max-w-3xl mx-auto drop-shadow-xl font-medium">
              4fly est un outil simple et gratuit pour gérer votre club aéronautique, que vous ayez 2 ou 200 membres. 
              Fini les tableurs complexes et la paperasse !
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  to="/create-club"
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 transform hover:scale-105"
                >
                  Créer mon club
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors duration-200"
                >
                  Se connecter
                </Link>
              </div>
              <p className="text-gray-400 mt-4 text-sm">
                Plan Découverte gratuit • Paiement CB en option (3%) • Configuration en 2 minutes
              </p>
            </motion.div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl hover:bg-gray-800/60 transition-all duration-200"
              >
                <div className="text-blue-500 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Section Test Rapide */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 mb-16 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-4">
              Démarrez avec le plan Découverte
            </h2>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Gérez vos réservations, membres et aéronefs sans frais. Activez les paiements en ligne uniquement quand vous en avez besoin.
            </p>
            <Link
              to="/create-club"
              className="inline-flex items-center px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 transform hover:scale-105"
            >
              Créer mon club gratuitement
              <ArrowForwardIcon className="ml-2" />
            </Link>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
