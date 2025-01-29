import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const LegalPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#1a1d21] pt-20">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-8">{t('legal.title')}</h1>
            
            <div className="space-y-8">
              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">{t('legal.publisher.title')}</h2>
                <div className="text-gray-300 space-y-2">
                  <p><strong>{t('legal.publisher.company')}:</strong> MELBA CAPITAL</p>
                  <p><strong>{t('legal.publisher.legalForm')}:</strong> {t('legal.publisher.legalFormValue')}</p>
                  <p><strong>{t('legal.publisher.address')}:</strong> 5 route de Cussieux, 42400 Saint Chamond</p>
                  <p><strong>SIREN:</strong> 840 514 913</p>
                  <p><strong>SIRET:</strong> 840 514 913 00010</p>
                  <p><strong>{t('legal.publisher.rcs')}:</strong> 840 514 913 R.C.S. Saint-Etienne</p>
                  <p><strong>{t('legal.publisher.capital')}:</strong> 2 700 000,00 €</p>
                  <p><strong>{t('legal.publisher.vat')}:</strong> FR69840514913</p>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">{t('legal.hosting.title')}</h2>
                <div className="text-gray-300 space-y-2">
                  <p><strong>{t('legal.hosting.provider')}:</strong> Amazon Web Services (AWS)</p>
                  <p><strong>{t('legal.hosting.company')}:</strong> Amazon Web Services Inc.</p>
                  <p><strong>{t('legal.hosting.address')}:</strong> 410 Terry Avenue North, Seattle, WA 98109-5210, USA</p>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">{t('legal.dataProtection.title')}</h2>
                <div className="text-gray-300 space-y-4">
                  <p>{t('legal.dataProtection.description')}</p>
                  <p>{t('legal.dataProtection.rights')}</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>{t('legal.dataProtection.email')}: contact@4fly.fr</li>
                    <li>{t('legal.dataProtection.mail')}: MELBA CAPITAL, 5 route de Cussieux, 42400 Saint Chamond</li>
                  </ul>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">{t('legal.intellectualProperty.title')}</h2>
                <div className="text-gray-300 space-y-4">
                  <p>{t('legal.intellectualProperty.description')}</p>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">{t('legal.cookies.title')}</h2>
                <div className="text-gray-300 space-y-4">
                  <p>{t('legal.cookies.description')}</p>
                  <p>{t('legal.cookies.consent')}</p>
                </div>
              </section>

              <section className="bg-[#212529] p-6 rounded-lg">
                <h2 className="text-2xl font-semibold text-white mb-4">{t('legal.links.title')}</h2>
                <div className="text-gray-300">
                  <p>{t('legal.links.description')}</p>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LegalPage;
