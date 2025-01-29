import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t, i18n } = useTranslation();
  
  const getLocalizedPath = (path: string) => {
    return path === '/' ? `/${i18n.language}` : `/${i18n.language}${path}`;
  };

  return (
    <footer className="bg-[#1a1d21] border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo et Description */}
          <div className="col-span-1 md:col-span-2">
            <Link to={getLocalizedPath('/')} className="text-2xl font-bold text-white">4fly</Link>
            <p className="mt-4 text-gray-400">
              {t('common.footerDescription')}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase mb-4">
              {t('nav.menu')}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to={getLocalizedPath('/features')} className="text-gray-400 hover:text-white transition-colors">
                  {t('nav.features')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedPath('/faq')} className="text-gray-400 hover:text-white transition-colors">
                  {t('nav.faq')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedPath('/contact')} className="text-gray-400 hover:text-white transition-colors">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase mb-4">
              {t('common.legal')}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to={getLocalizedPath('/legal')} className="text-gray-400 hover:text-white transition-colors">
                  {t('common.legalMentions')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedPath('/cgv')} className="text-gray-400 hover:text-white transition-colors">
                  {t('common.cgv')}
                </Link>
              </li>
              <li>
                <Link to={getLocalizedPath('/rgpd')} className="text-gray-400 hover:text-white transition-colors">
                  {t('common.rgpd')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-sm text-center">
            {new Date().getFullYear()} {t('common.copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
