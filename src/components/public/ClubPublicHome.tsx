import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { RichTextContent } from '../ui/rich-text-editor';
import { PublicHeader } from './layout/PublicHeader';

type ClubData = {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
};

type WebsiteSettings = {
  logo_url: string | null;
  carousel_images: string[];
  hero_title: string;
  hero_subtitle: string | null;
  cta_text: string;
  cached_fleet: {
    id: string;
    name: string;
    registration: string;
    type: string;
    description: string | null;
    image_url: string | null;
    hourly_rate: number;
  }[];
};

type ClubPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
};

const MotionImage = motion.img;
const MotionButton = motion(Button);

const ClubPublicHome: React.FC = () => {
  const { clubCode, slug } = useParams();
  const location = useLocation();
  const isPageRoute = location.pathname.includes('/page/');

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch club data
  const { data: club, isLoading: isClubLoading } = useQuery<ClubData>({
    queryKey: ['publicClub', clubCode],
    queryFn: async () => {
      if (!clubCode) return null;
      const upperClubCode = clubCode.toUpperCase();
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('code', upperClubCode)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubCode,
  });

  // Fetch club website settings
  const { data: websiteSettings } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('*')
        .eq('club_id', club?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || {
        logo_url: null,
        carousel_images: [],
        hero_title: 'Bienvenue à l\'aéroclub',
        hero_subtitle: null,
        cta_text: 'Nous rejoindre',
        cached_fleet: []
      };
    },
    enabled: !!club?.id,
  });

  // Fetch club pages
  const { data: pages } = useQuery<ClubPage[]>({
    queryKey: ['clubPages', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_pages')
        .select('*')
        .eq('club_id', club?.id)
        .order('title');

      if (error) throw error;
      return data || [];
    },
    enabled: !!club?.id,
  });

  // Auto-play effect for carousel
  useEffect(() => {
    if (!isAutoPlaying || !websiteSettings?.carousel_images?.length) return;

    const timer = setInterval(() => {
      setCurrentImageIndex((current) =>
        current === (websiteSettings?.carousel_images?.length || 1) - 1 ? 0 : current + 1
      );
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, websiteSettings?.carousel_images?.length]);

  if (!clubCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Erreur</h2>
          <p className="text-gray-600">Code du club non spécifié</p>
        </div>
      </div>
    );
  }

  if (isClubLoading || !club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Chargement...</h2>
          <p className="text-gray-600">Veuillez patienter pendant le chargement des informations du club</p>
        </div>
      </div>
    );
  }

  const currentPage = isPageRoute && pages ? pages.find(p => p.slug === slug) : null;

  const nextImage = () => {
    if (!websiteSettings?.carousel_images?.length) return;
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) =>
      (prev + 1) % websiteSettings.carousel_images.length
    );
  };

  const previousImage = () => {
    if (!websiteSettings?.carousel_images?.length) return;
    setIsAutoPlaying(false);
    setCurrentImageIndex((prev) =>
      prev === 0 ? websiteSettings.carousel_images.length - 1 : prev - 1
    );
  };

  const goToImage = (index: number) => {
    setIsAutoPlaying(false);
    setCurrentImageIndex(index);
  };

  const menuItems = [
    { label: 'Accueil', href: `/club/${clubCode}` },
    { label: 'Formation', href: `/club/${clubCode}/formation` },
    { label: 'Avions', href: `/club/${clubCode}/avions` },
    { label: 'Tarifs', href: `/club/${clubCode}/tarifs` },
    { label: 'Contact', href: `/club/${clubCode}/contact` },
    ...(pages?.map(page => ({
      label: page.title,
      href: `/club/${clubCode}/page/${page.slug}`
    })) || [])
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader
        clubCode={clubCode}
        clubName={club?.name}
        logoUrl={websiteSettings?.logo_url}
        pages={pages}
      />

      {/* Main Content */}
      <div className="pt-16">
        {currentPage ? (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">{currentPage.title}</h1>
            <RichTextContent content={currentPage.content} />
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div className="relative h-[600px] bg-gray-900">
              {/* Carousel */}
              <div className="relative h-[600px] overflow-hidden">
                {websiteSettings?.carousel_images?.length > 0 ? (
                  <AnimatePresence initial={false}>
                    <MotionImage
                      key={currentImageIndex}
                      src={websiteSettings.carousel_images[currentImageIndex]}
                      alt={`Slide ${currentImageIndex + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7 }}
                    />
                  </AnimatePresence>
                ) : (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}

                {/* Navigation buttons */}
                {websiteSettings?.carousel_images?.length > 1 && (
                  <>
                    <button
                      onClick={previousImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
                      aria-label="Image précédente"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
                      aria-label="Image suivante"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative z-10 max-w-4xl mx-auto text-center text-white px-4">
                  <motion.h1 
                    className="text-5xl md:text-6xl font-bold mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    {websiteSettings?.hero_title || "Bienvenue à l'aéroclub"}
                  </motion.h1>

                  {websiteSettings?.hero_subtitle && (
                    <motion.p
                      className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      {websiteSettings.hero_subtitle}
                    </motion.p>
                  )}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <Button
                      size="lg"
                      className="bg-white text-gray-900 hover:bg-gray-100 font-semibold px-8 py-3 rounded-full"
                    >
                      {websiteSettings?.cta_text || 'Nous rejoindre'}
                    </Button>
                  </motion.div>
                </div>

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              </div>

              {/* Bottom gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* Main content sections */}
            <div className="py-16 space-y-24">
              {/* Section Bienvenue */}
              <section className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto text-center">
                  <h2 className="text-3xl font-bold mb-6">Bienvenue à {club.name}</h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Situé à {club.address}, notre aéroclub vous accueille dans un cadre exceptionnel 
                    pour découvrir ou perfectionner votre pratique du pilotage.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <h3 className="text-xl font-semibold mb-3">Formation</h3>
                      <p className="text-gray-600">
                        Formation initiale et perfectionnement avec nos instructeurs qualifiés
                      </p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <h3 className="text-xl font-semibold mb-3">Location</h3>
                      <p className="text-gray-600">
                        Une flotte diversifiée d'avions disponibles pour nos membres
                      </p>
                    </div>
                    <div className="p-6 bg-gray-50 rounded-lg">
                      <h3 className="text-xl font-semibold mb-3">Baptêmes</h3>
                      <p className="text-gray-600">
                        Découvrez l'aviation lors d'un vol d'initiation
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section Notre Flotte */}
              <section className="bg-gray-50 py-16">
                <div className="container mx-auto px-4">
                  <h2 className="text-3xl font-bold text-center mb-12">Notre Flotte</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {websiteSettings?.cached_fleet?.slice(0, 3).map((aircraft) => (
                      <div key={aircraft.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="aspect-w-16 aspect-h-9">
                          {aircraft.image_url ? (
                            <img 
                              src={aircraft.image_url} 
                              alt={aircraft.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400">Photo non disponible</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-semibold">{aircraft.name}</h3>
                            <span className="text-sm font-medium text-gray-500">{aircraft.registration}</span>
                          </div>
                          <p className="text-gray-600 text-sm mb-4">{aircraft.type}</p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-lg font-semibold text-blue-600">
                              {(aircraft.hourly_rate || 0).toLocaleString('fr-FR')} € / heure
                            </span>
                          </div>
                          {aircraft.description && (
                            <p className="text-gray-600 mt-4">
                              {aircraft.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-8">
                    <Link
                      to={`/club/${clubCode}/avions`}
                      className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                    >
                      Découvrir toute notre flotte
                    </Link>
                  </div>
                </div>
              </section>

              {/* Section Actualités */}
              <section className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-3xl font-bold text-center mb-12">Dernières Actualités</h2>
                  <div className="space-y-8">
                    {pages?.slice(0, 3).map((page, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">
                            <Link to={`/club/${clubCode}/page/${page.slug}`} className="hover:text-blue-600">
                              {page.title}
                            </Link>
                          </h3>
                          <div className="text-gray-600 line-clamp-3">
                            <RichTextContent content={page.content} />
                          </div>
                          <Link 
                            to={`/club/${clubCode}/page/${page.slug}`}
                            className="inline-block mt-4 text-blue-600 hover:text-blue-800"
                          >
                            Lire la suite →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Section Contact */}
              <section className="bg-gray-900 text-white py-16">
                <div className="container mx-auto px-4">
                  <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-6">Nous Contacter</h2>
                    <p className="text-lg mb-8">
                      Vous souhaitez en savoir plus ? N'hésitez pas à nous contacter !
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <h3 className="text-xl font-semibold mb-3">Adresse</h3>
                        <p>{club.address}</p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-3">Téléphone</h3>
                        <p>{club.phone || "Contactez-nous"}</p>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-3">Email</h3>
                        <p>{club.email || "Contactez-nous"}</p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="mt-12 bg-white text-gray-900 hover:bg-gray-100"
                    >
                      Nous Contacter
                    </Button>
                  </div>
                </div>
              </section>
            </div>

            {/* Contenu supplémentaire... */}
            <div className="max-w-7xl mx-auto px-4 py-12">
              {/* Vous pouvez ajouter plus de sections ici */}
            </div>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-12">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Contact</h3>
                    {club.address && <p className="text-gray-300">{club.address}</p>}
                    {club.phone && <p className="text-gray-300">{club.phone}</p>}
                    {club.email && <p className="text-gray-300">{club.email}</p>}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Liens rapides</h3>
                    <ul className="space-y-2">
                      <li><a href="#" className="text-gray-300 hover:text-white">Réserver un vol</a></li>
                      <li><a href="#" className="text-gray-300 hover:text-white">Météo</a></li>
                      <li><a href="#" className="text-gray-300 hover:text-white">Formation</a></li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Suivez-nous</h3>
                    <div className="flex space-x-4">
                      <a href="#" className="text-gray-300 hover:text-white">
                        <span className="sr-only">Facebook</span>
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-700 text-center">
                  <p className="text-gray-300">&copy; {new Date().getFullYear()} {club.name}. Tous droits réservés.</p>
                </div>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default ClubPublicHome;
