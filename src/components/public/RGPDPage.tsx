import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const RGPDPage = () => {
  const { t } = useTranslation();

  const renderList = (key: string) => {
    const items = t(key, { returnObjects: true });
    return Array.isArray(items) ? (
      <ul className="list-disc list-inside space-y-2 ml-4">
        {items.map((item: string, index: number) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-[#1a1d21] py-16 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          {t('rgpd.title')}
        </h1>

        <div className="space-y-8 text-gray-300">
          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">{t('rgpd.introduction.title')}</h2>
            <p className="mb-4">{t('rgpd.introduction.content')}</p>
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">{t('rgpd.dataCollected.title')}</h2>
            <p className="mb-4">{t('rgpd.dataCollected.intro')}</p>
            {renderList('rgpd.dataCollected.items')}
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">{t('rgpd.dataUsage.title')}</h2>
            <p className="mb-4">{t('rgpd.dataUsage.intro')}</p>
            {renderList('rgpd.dataUsage.items')}
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">{t('rgpd.dataProtection.title')}</h2>
            <p className="mb-4">{t('rgpd.dataProtection.intro')}</p>
            {renderList('rgpd.dataProtection.items')}
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">{t('rgpd.rights.title')}</h2>
            <p className="mb-4">{t('rgpd.rights.intro')}</p>
            {renderList('rgpd.rights.items')}
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">{t('rgpd.contact.title')}</h2>
            <p className="mb-4">{t('rgpd.contact.content')}</p>
          </section>

          <section className="bg-[#212529] p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">{t('rgpd.update.title')}</h2>
            <p>{t('rgpd.update.content', { date: new Date('2025-01-13').toLocaleDateString(t('common.locale')) })}</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default RGPDPage;
