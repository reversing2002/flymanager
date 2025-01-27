import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '../../ui/button';

interface PublicHeaderProps {
  clubCode: string;
  clubName?: string;
  logoUrl?: string | null;
  pages?: Array<{ title: string; slug: string; }>;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  clubCode,
  clubName,
  logoUrl,
  pages = []
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Accueil', href: `/club/${clubCode}` },
    { label: 'Actualités', href: `/club/${clubCode}/news` },
    { label: 'Formation', href: `/club/${clubCode}/training` },
    { label: 'Avions', href: `/club/${clubCode}/fleet` },
    { label: 'Événements', href: `/club/${clubCode}/events` },
    { label: 'Tarifs', href: `/club/${clubCode}/tarifs` },
    { label: 'Contact', href: `/club/${clubCode}/contact` },
    { label: 'Espace membre', href: `/login` }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and club name */}
          <Link to={`/club/${clubCode}`} className="flex items-center gap-2">
            {logoUrl && (
              <img
                src={logoUrl}
                alt={clubName}
                className="h-8 w-auto"
              />
            )}
            <span className="font-semibold text-lg">{clubName}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t"
            >
              <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
