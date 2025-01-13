import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import LoginIcon from '@mui/icons-material/Login';

const menuItems = [
  { path: '/', label: 'Accueil', icon: <HomeIcon /> },
  { path: '/features', label: 'Fonctionnalités', icon: <InfoIcon /> },
  { path: '/faq', label: 'FAQ', icon: <QuestionAnswerIcon /> },
  { path: '/contact', label: 'Contact', icon: <ContactSupportIcon /> },
];

const PublicNavbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-[#1a1d21] border-b border-gray-800 fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-white">
              4fly
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'text-white bg-[#2a2e33]'
                    : 'text-gray-300 hover:text-white hover:bg-[#2a2e33]'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            <Link to="/login">
              <Button
                variant="contained"
                color="primary"
                startIcon={<LoginIcon />}
                className="ml-4"
                sx={{
                  backgroundColor: '#3b82f6',
                  '&:hover': {
                    backgroundColor: '#2563eb',
                  },
                }}
              >
                Connexion
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
            >
              {isOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0 }}
        className="md:hidden overflow-hidden bg-[#212529]"
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === item.path
                  ? 'text-white bg-[#2a2e33]'
                  : 'text-gray-300 hover:text-white hover:bg-[#2a2e33]'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
          ))}
          <Link
            to="/login"
            className="flex items-center px-3 py-2 rounded-md text-base font-medium text-white bg-blue-500 hover:bg-blue-600"
            onClick={() => setIsOpen(false)}
          >
            <LoginIcon className="mr-2" />
            Connexion
          </Link>
        </div>
      </motion.div>
    </nav>
  );
};

export default PublicNavbar;
