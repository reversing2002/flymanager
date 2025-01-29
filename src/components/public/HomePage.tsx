import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import PaymentsIcon from '@mui/icons-material/Payments';
import GroupIcon from '@mui/icons-material/Group';
import AviationImage from '../common/AviationImage';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeSEO from '../SEO/HomeSEO';

const features = [
  {
    icon: <FlightTakeoffIcon className="h-6 w-6" />,
    key: 'flightManagement'
  },
  {
    icon: <ScheduleIcon className="h-6 w-6" />,
    key: 'reservations'
  },
  {
    icon: <BuildIcon className="h-6 w-6" />,
    key: 'maintenance'
  },
  {
    icon: <SchoolIcon className="h-6 w-6" />,
    key: 'training'
  },
  {
    icon: <PaymentsIcon className="h-6 w-6" />,
    key: 'payments'
  },
  {
    icon: <GroupIcon className="h-6 w-6" />,
    key: 'memberManagement'
  }
];

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const backgroundImages = [
    'login-1.png',
    'login-2.png',
    'login-3.png',
    'login-4.png',
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === backgroundImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <HomeSEO />
      <div className="min-h-screen">
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
        <main className="relative">
          <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            {/* Hero Section avec CTA principal */}
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-8 drop-shadow-2xl">
                  {t('home.title')}
                </h1>
                <p className="text-xl text-gray-100 mb-12 max-w-3xl mx-auto drop-shadow-xl font-medium">
                  {t('home.description')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link
                    to="/create-club"
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 transform hover:scale-105"
                  >
                    {t('home.createClub')}
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors duration-200"
                  >
                    {t('common.login')}
                  </Link>
                </div>
                <p className="text-gray-400 mt-4 text-sm">
                  {t('home.configurationTime')}
                </p>
              </motion.div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl hover:bg-gray-800/60 transition-all duration-200"
                >
                  <div className="text-blue-500 mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {t(`features.${feature.key}.title`)}
                  </h3>
                  <p className="text-gray-300">
                    {t(`features.${feature.key}.description`)}
                  </p>
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
                {t('home.startTitle')}
              </h2>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                {t('home.startDescription')}
              </p>
              <Link
                to="/create-club"
                className="inline-flex items-center px-8 py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 transform hover:scale-105"
              >
                {t('home.startButton')}
                <ArrowForwardIcon className="ml-2" />
              </Link>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default HomePage;
