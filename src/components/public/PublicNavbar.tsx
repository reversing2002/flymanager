import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '../common/Logo';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Accueil', path: '/' },
    { label: 'Fonctionnalités', path: '/features' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contact', path: '/contact' },
    { label: 'CGV', path: '/cgv' },
  ];

  return (
    <nav className="bg-[#1a1d21] fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link to="/">
              <Logo className="h-8 w-auto" />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/create-club"
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                Créer un club
              </Link>
              <Link
                to="/login"
                className="border border-blue-500 text-blue-500 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-500 hover:text-white transition-colors"
              >
                Se connecter
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-400 hover:text-white p-2"
            >
              {isOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[#1a1d21] border-t border-gray-700">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/create-club"
                className="bg-blue-500 text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-600 w-full text-center mt-4"
                onClick={() => setIsOpen(false)}
              >
                Créer un club
              </Link>
              <Link
                to="/login"
                className="border border-blue-500 text-blue-500 block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-500 hover:text-white w-full text-center mt-2"
                onClick={() => setIsOpen(false)}
              >
                Se connecter
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default PublicNavbar;
