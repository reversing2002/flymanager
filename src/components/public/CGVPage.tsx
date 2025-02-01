import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PageSEO from '@/components/SEO/PageSEO';

const CGVPage = () => {
  const { t } = useTranslation();

  const sections = [
    {
      title: t('cgv.article1.title'),
      content: t('cgv.article1.content')
    },
    {
      title: t('cgv.article2.title'),
      content: t('cgv.article2.content')
    },
    {
      title: t('cgv.article3.title'),
      content: t('cgv.article3.content')
    },
    {
      title: t('cgv.article4.title'),
      content: t('cgv.article4.content')
    },
    {
      title: t('cgv.article5.title'),
      content: t('cgv.article5.content')
    },
    {
      title: t('cgv.article6.title'),
      content: t('cgv.article6.content')
    },
    {
      title: t('cgv.article7.title'),
      content: t('cgv.article7.content')
    },
    {
      title: t('cgv.article8.title'),
      content: t('cgv.article8.content')
    },
    {
      title: t('cgv.article9.title'),
      content: t('cgv.article9.content')
    }
  ];

  return (
    <>
      <PageSEO pageType="cgv" />
      <div className="min-h-screen bg-[#1a1d21] pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-white mb-4">
              {t('cgv.title')}
            </h1>
            <p className="text-gray-300">
              {t('cgv.lastUpdate', { date: new Date().toLocaleDateString(t('common.locale')) })}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#2a2e33] p-6 rounded-lg"
              >
                <h2 className="text-xl font-semibold text-white mb-4">
                  {section.title}
                </h2>
                <div className="text-gray-300 space-y-2 whitespace-pre-line">
                  {section.content}
                </div>
              </motion.div>
            ))}
          </motion.div>

          
        </div>
      </div>
    </>
  );
};

export default CGVPage;
