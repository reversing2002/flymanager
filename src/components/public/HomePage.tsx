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
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto text-center"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-8 drop-shadow-2xl">
              Gérez votre club{' '}
              <span className="text-blue-400 bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">simplement</span>
            </h1>
            <p className="text-xl text-gray-100 mb-12 max-w-3xl mx-auto drop-shadow-xl font-medium">
              4fly est un outil simple et gratuit pour gérer votre club aéronautique, que vous ayez 2 ou 200 membres. 
              Fini les tableurs complexes et la paperasse !
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/login"
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:-translate-y-0.5"
              >
                Se connecter
              </Link>

              <Link
                to="/contact"
                className="bg-black/40 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-all duration-300 hover:border-white/30"
              >
                Nous contacter
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <div className="bg-gradient-to-b from-transparent via-[#1a1d21]/95 to-[#1a1d21]">
          <section className="py-32">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-black/50 backdrop-blur-md border border-white/10 p-8 rounded-xl hover:bg-white/5 transition-all duration-300 hover:border-white/20 hover:shadow-lg group"
                  >
                    <div className="text-blue-400 mb-4 text-2xl group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                    <h3 className="text-2xl font-semibold text-white mb-3 drop-shadow-lg">
                      {feature.title}
                    </h3>
                    <p className="text-gray-200">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* CTA Section */}
        <div className="bg-[#1a1d21]">
          <section className="py-20">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold text-white mb-8">
                Vous souhaitez en savoir plus ?
              </h2>
              <p className="text-xl text-gray-200 mb-8">
                Découvrez comment 4fly peut vous aider à simplifier la gestion de votre club aéronautique.
              </p>
              <Link
                to="/contact"
                className="inline-block bg-blue-500/20 border border-blue-500/30 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-500/30 transition-all duration-300 hover:border-blue-500/50"
              >
                Contactez-nous
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default HomePage;
