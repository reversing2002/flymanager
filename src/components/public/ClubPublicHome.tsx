import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { RichTextContent } from '../ui/rich-text-editor';
import { PublicHeader } from './layout/PublicHeader';
import { ClubFooter } from './layout/ClubFooter';
import { GraduationCap, Plane, Calendar, Receipt, Gift, MessageCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateSlug, shortenUuid } from '../../utils/slug';

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
  cached_news: {
    id: string;
    title: string;
    excerpt: string | null;
    published_at: string;
    image_url: string | null;
  }[] | null;
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
        cached_news: null,
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

              {/* Section Actualités */}
              {websiteSettings?.cached_news && websiteSettings.cached_news.length > 0 && (
                <section className="py-12 bg-white">
                  <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-8">Actualités du club</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {websiteSettings.cached_news.map((news) => (
                        <motion.div
                          key={news.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white rounded-lg shadow-lg overflow-hidden"
                        >
                          {news.image_url && (
                            <div className="relative h-48">
                              <img
                                src={news.image_url}
                                alt={news.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="p-6">
                            <h3 className="text-xl font-semibold mb-2">{news.title}</h3>
                            <p className="text-sm text-gray-500 mb-3">
                              {format(new Date(news.published_at), 'PPP', { locale: fr })}
                            </p>
                            {news.excerpt && (
                              <p className="text-gray-600 mb-4">{news.excerpt}</p>
                            )}
                            <Link
                              to={`/club/${clubCode}/actualites/${shortenUuid(news.id)}/${generateSlug(news.title)}`}
                              className="inline-flex items-center text-primary hover:text-primary/80"
                            >
                              Lire la suite
                              <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
              {/* Section Pages */}
              <section className="py-16">
                <div className="container mx-auto px-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Formation */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <Link to={`/club/${clubCode}/training`} className="block">
                        <div className="p-6">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                            <GraduationCap className="w-6 h-6 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">Formation</h3>
                          <p className="text-gray-600">Découvrez nos programmes de formation pour devenir pilote privé ou professionnel.</p>
                        </div>
                      </Link>
                    </motion.div>

                    {/* Notre Flotte */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <Link to={`/club/${clubCode}/fleet`} className="block">
                        <div className="p-6">
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                            <Plane className="w-6 h-6 text-orange-600" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-orange-600 transition-colors">Notre Flotte</h3>
                          <p className="text-gray-600">Explorez notre flotte d'avions disponibles pour la formation et la location.</p>
                        </div>
                      </Link>
                    </motion.div>

                    {/* Événements */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <Link to={`/club/${clubCode}/events`} className="block">
                        <div className="p-6">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                            <Calendar className="w-6 h-6 text-green-600" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-green-600 transition-colors">Événements</h3>
                          <p className="text-gray-600">Participez à nos événements, journées portes ouvertes et rassemblements aéronautiques.</p>
                        </div>
                      </Link>
                    </motion.div>

                    {/* Tarifs */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <Link to={`/club/${clubCode}/tarifs`} className="block">
                        <div className="p-6">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                            <Receipt className="w-6 h-6 text-purple-600" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-purple-600 transition-colors">Tarifs</h3>
                          <p className="text-gray-600">Consultez nos tarifs pour la formation, la location d'avions et l'adhésion au club.</p>
                        </div>
                      </Link>
                    </motion.div>

                    {/* Vol découverte */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <Link to={`/club/${clubCode}/vol-decouverte`} className="block">
                        <div className="p-6">
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-200 transition-colors">
                            <Gift className="w-6 h-6 text-red-600" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-red-600 transition-colors">Vol Découverte</h3>
                          <p className="text-gray-600">Offrez ou vivez l'expérience unique d'un premier vol aux commandes d'un avion.</p>
                        </div>
                      </Link>
                    </motion.div>

                    {/* Contact */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.6 }}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <Link to={`/club/${clubCode}/contact`} className="block">
                        <div className="p-6">
                          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-200 transition-colors">
                            <MessageCircle className="w-6 h-6 text-teal-600" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2 group-hover:text-teal-600 transition-colors">Contact</h3>
                          <p className="text-gray-600">Contactez-nous pour plus d'informations ou pour planifier votre visite au club.</p>
                        </div>
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </section>


              
            </div>
          </>
        )}
      </div>
      <ClubFooter />
    </div>
  );
};

export default ClubPublicHome;
