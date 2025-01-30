import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  People as PeopleIcon,
  School as SchoolIcon,
  Settings as SettingsIcon,
  Phone as PhoneIcon 
} from '@mui/icons-material';
import PageSEO from '../SEO/PageSEO';

const AboutUsPage: React.FC = () => {
  const { t } = useTranslation();
  
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const engagementItems = [
    {
      key: 'training',
      icon: SchoolIcon,
      image: "/images/about/formation-club.jpg"
    },
    {
      key: 'setup',
      icon: SettingsIcon,
      image: "/images/about/migration-donnees.jpg"
    },
    {
      key: 'support',
      icon: PhoneIcon,
      image: "/images/about/support-club.jpg"
    },
    {
      key: 'accompaniment',
      icon: PeopleIcon,
      image: "/images/about/accompagnement-club.jpg"
    }
  ];

  return (
    <>
      <PageSEO pageType="about" />
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        {/* Hero Section avec image de fond */}
        <motion.section 
          className="relative py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
          initial="initial"
          animate="animate"
          variants={fadeIn}
        >
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src="/images/about/team-hero.jpg" 
              alt={t('about.images.team')}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-gray-800/80" />
          </div>
          <div className="relative">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
              {t('about.hero.title')}
            </h1>
            <p className="text-xl text-gray-300 text-center max-w-3xl mx-auto">
              {t('about.hero.description')}
            </p>
          </div>
        </motion.section>

        {/* Notre Vision avec image */}
        <motion.section 
          className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
          initial="initial"
          animate="animate"
          variants={fadeIn}
        >
          <div className="bg-gray-800/50 rounded-2xl p-8 backdrop-blur-sm overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">{t('about.vision.title')}</h2>
                <p className="text-gray-300 text-lg leading-relaxed">
                  {t('about.vision.description')}
                </p>
                <div className="mt-6 flex items-center text-blue-400">
                  <PeopleIcon className="h-6 w-6 mr-2" />
                  <span className="text-sm">{t('about.vision.approach')}</span>
                </div>
              </div>
              <div className="relative h-64 md:h-full rounded-xl overflow-hidden">
                <img 
                  src="/images/about/vision-terrain.jpg" 
                  alt={t('about.images.vision')}
                  className="rounded-xl w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Notre Engagement */}
        <motion.section 
          className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
          initial="initial"
          animate="animate"
          variants={fadeIn}
        >
          <h2 className="text-3xl font-bold mb-12 text-center">{t('about.engagement.title')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {engagementItems.map((item, index) => (
              <motion.div
                key={index}
                className="bg-gray-800/30 rounded-xl overflow-hidden hover:bg-gray-700/30 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="h-48 relative">
                  <img 
                    src={item.image} 
                    alt={t(`about.engagement.items.${item.key}.title`)}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
                </div>
                <div className="p-6">
                  <item.icon className="h-12 w-12 mx-auto mb-4 text-blue-400" />
                  <h3 className="text-xl font-semibold mb-2 text-center">
                    {t(`about.engagement.items.${item.key}.title`)}
                  </h3>
                  <p className="text-sm text-blue-400 mb-3 text-center">
                    {t(`about.engagement.items.${item.key}.subtitle`)}
                  </p>
                  <p className="text-gray-300 text-center">
                    {t(`about.engagement.items.${item.key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Support et Assistance */}
        <motion.section 
          className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-20"
          initial="initial"
          animate="animate"
          variants={fadeIn}
        >
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="relative h-64 md:h-full">
                <img 
                  src="/images/about/accompagnement.jpg" 
                  alt={t('about.images.support')}
                  className="rounded-xl w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-8">{t('about.support.title')}</h2>
                <div className="space-y-4">
                  {t('about.support.items', { returnObjects: true }).map((item: string, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-2 w-2 bg-blue-400 rounded-full" />
                      <p className="text-lg text-gray-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </>
  );
};

export default AboutUsPage;
