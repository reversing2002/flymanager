import React from 'react';
import { motion } from 'framer-motion';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BuildIcon from '@mui/icons-material/Build';
import SchoolIcon from '@mui/icons-material/School';
import PaymentsIcon from '@mui/icons-material/Payments';
import GroupIcon from '@mui/icons-material/Group';
import ChatIcon from '@mui/icons-material/Chat';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SecurityIcon from '@mui/icons-material/Security';
import { useTranslation } from 'react-i18next';
import { WavyBackground } from '@/components/ui/wavy-background';
import PageSEO from '@/components/SEO/PageSEO';

const featureIcons = {
  flights: <FlightTakeoffIcon className="h-8 w-8" />,
  reservations: <ScheduleIcon className="h-8 w-8" />,
  maintenance: <BuildIcon className="h-8 w-8" />,
  training: <SchoolIcon className="h-8 w-8" />,
  finance: <PaymentsIcon className="h-8 w-8" />,
  members: <GroupIcon className="h-8 w-8" />,
  communication: <ChatIcon className="h-8 w-8" />,
  statistics: <AssessmentIcon className="h-8 w-8" />,
  events: <CalendarMonthIcon className="h-8 w-8" />,
  security: <SecurityIcon className="h-8 w-8" />
};

const featureKeys = [
  'flights',
  'reservations',
  'maintenance',
  'training',
  'finance',
  'members',
  'communication',
  'statistics',
  'events',
  'security'
] as const;

const FeaturesPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageSEO pageType="features" />
      <div className="min-h-screen relative">
        {/* Background avec WavyBackground */}
        <div className="fixed inset-0 -z-10">
          <WavyBackground 
            className="max-w-full"
            containerClassName="h-screen"
            colors={['#0f172a', '#1e3a8a', '#172554', '#1e40af', '#1e3a8a']}
            waveWidth={200}
            backgroundFill="#020617"
            blur={3}
            speed="slow"
            waveOpacity={0.2}
          />
        </div>

        {/* Contenu */}
        <div className="relative z-10">
          {/* Hero Section */}
          <div className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-7xl mx-auto text-center"
            >
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                {t('featuresPage.hero.title')}
              </h1>
              <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto">
                {t('featuresPage.hero.subtitle')}
              </p>
            </motion.div>
          </div>

          {/* Grid des fonctionnalités */}
          <div className="py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featureKeys.map((key, index) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-black/50 backdrop-blur-md border border-white/10 p-8 rounded-xl hover:bg-white/5 transition-all duration-300"
                  >
                    <div className="text-blue-400 mb-4">{featureIcons[key]}</div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {t(`featuresPage.items.${key}.title`)}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      {t(`featuresPage.items.${key}.description`)}
                    </p>
                    <ul className="space-y-2">
                      {t(`featuresPage.items.${key}.details`, { returnObjects: true }).map((detail: string, idx: number) => (
                        <li key={idx} className="flex items-center text-gray-300">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FeaturesPage;
