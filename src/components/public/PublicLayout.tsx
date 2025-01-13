import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicSidebar from '../layout/PublicSidebar';
import Footer from '../layout/Footer';

const PublicFooter = () => (
  <footer className="bg-[#212529] text-gray-300">
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <h3 className="text-white font-semibold">4fly</h3>
          <p className="text-sm">
            La solution complète pour la gestion de votre aéroclub.
          </p>
        </div>
        
        <div>
          <h3 className="text-white font-semibold mb-4">Navigation</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/" className="hover:text-white transition-colors">Accueil</a></li>
            <li><a href="/features" className="hover:text-white transition-colors">Fonctionnalités</a></li>
            <li><a href="/faq" className="hover:text-white transition-colors">FAQ</a></li>
            <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
          </ul>
        </div>
        
        <div>
          <h3 className="text-white font-semibold mb-4">Légal</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/cgv" className="hover:text-white transition-colors">CGV</a></li>
            <li><a href="/privacy" className="hover:text-white transition-colors">Politique de confidentialité</a></li>
            <li><a href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</a></li>
          </ul>
        </div>
        
        <div>
          <h3 className="text-white font-semibold mb-4">Contact</h3>
          <ul className="space-y-2 text-sm">
            <li>contact@4fly.fr</li>
            <li>+33 (0)1 23 45 67 89</li>
            <li>123 Avenue de l'Aviation</li>
            <li>75001 Paris, France</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8 pt-8 border-t border-gray-700 text-sm text-center">
        <p>&copy; {new Date().getFullYear()} 4fly. Tous droits réservés.</p>
      </div>
    </div>
  </footer>
);

const PublicLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Ouvrir automatiquement la sidebar sur desktop
  React.useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen flex">
      <PublicSidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <main className="flex-grow pt-16 lg:pt-0">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default PublicLayout;
