import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Logo } from '../common/Logo';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import HomeIcon from '@mui/icons-material/Home';
import FeaturesIcon from '@mui/icons-material/Stars';
import HelpIcon from '@mui/icons-material/Help';
import ContactIcon from '@mui/icons-material/Mail';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import InformationCircleIcon from '@mui/icons-material/Info';
import LanguageSelector from '../common/LanguageSelector';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { label: t('nav.home'), path: '/', icon: <HomeIcon className="h-5 w-5" /> },
    { label: t('nav.about'), path: '/about', icon: <InformationCircleIcon className="h-5 w-5" /> },
    { label: t('nav.features'), path: '/features', icon: <FeaturesIcon className="h-5 w-5" /> },
    { label: t('nav.pricing'), path: '/tarifs', icon: <CreditCardIcon className="h-5 w-5" /> },
    { label: t('nav.faq'), path: '/faq', icon: <HelpIcon className="h-5 w-5" /> },
    { label: t('nav.contact'), path: '/contact', icon: <ContactIcon className="h-5 w-5" /> },
  ];

  return (
    <header className="relative">
      {/* Fixed top bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#1a1d21] z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex-shrink-0">
              <Link to="/">
                <Logo className="h-8 w-auto" />
              </Link>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                    location.pathname === item.path ? 'bg-gray-900 text-white' : ''
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <div className="border-l border-gray-700 h-6 mx-2" />
              <div className="text-white">
                <LanguageSelector />
              </div>
              <Link
                to="/login"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <LoginIcon className="h-5 w-5" />
                <span>{t('common.login')}</span>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-4">
              <div className="text-white">
                <LanguageSelector />
              </div>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-300 hover:text-white p-2"
              >
                {isOpen ? (
                  <CloseIcon className="h-6 w-6" />
                ) : (
                  <MenuIcon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-0 top-16 bg-[#1a1d21] z-40 md:hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 ${
                    location.pathname === item.path ? 'bg-gray-900 text-white' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <Link
                to="/login"
                className="bg-blue-600 text-white block px-3 py-2 rounded-md text-base font-medium flex items-center gap-2 hover:bg-blue-700"
                onClick={() => setIsOpen(false)}
              >
                <LoginIcon className="h-5 w-5" />
                <span>{t('common.login')}</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default PublicNavbar;
