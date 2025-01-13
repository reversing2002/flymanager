import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../common/Logo';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import HomeIcon from '@mui/icons-material/Home';
import FeaturesIcon from '@mui/icons-material/Stars';
import HelpIcon from '@mui/icons-material/Help';
import ContactIcon from '@mui/icons-material/Mail';
import CreditCardIcon from '@mui/icons-material/CreditCard';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Accueil', path: '/', icon: <HomeIcon className="h-5 w-5" /> },
    { label: 'Fonctionnalités', path: '/features', icon: <FeaturesIcon className="h-5 w-5" /> },
    { label: 'Tarifs', path: '/pricing', icon: <CreditCardIcon className="h-5 w-5" /> },
    { label: 'FAQ', path: '/faq', icon: <HelpIcon className="h-5 w-5" /> },
    { label: 'Contact', path: '/contact', icon: <ContactIcon className="h-5 w-5" /> },
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
                    location.pathname === item.path ? 'bg-gray-900' : ''
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <Link
                to="/login"
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <LoginIcon className="h-5 w-5" />
                Se connecter
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center space-x-3">
              <Link
                to="/login"
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
              >
                <LoginIcon className="h-5 w-5" />
                <span>Connexion</span>
              </Link>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-gray-700 transition-colors"
                aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {isOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from hiding under fixed navbar */}
      <div className="h-16" />

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 left-0 right-0 md:hidden z-40"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#1a1d21] border-t border-gray-700 shadow-lg">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-gray-300 hover:text-white flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium hover:bg-gray-700 transition-colors ${
                    location.pathname === item.path ? 'bg-gray-900' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default PublicNavbar;
