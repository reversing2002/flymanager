import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { PageLayout } from '../layout/PageLayout';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import type { ClubNews } from '../../../types/news';
import { generateSlug, shortenUuid } from '../../../utils/slug';
import { motion } from 'framer-motion';

const ITEMS_PER_PAGE = 9;

interface WebsiteSettings {
  cached_news: ClubNews[];
  logo_url: string | null;
  carousel_images: string[];
}

const NewsPage: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Récupérer l'ID du club à partir de son code
  const { data: club } = useQuery({
    queryKey: ['club', clubCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, logo_url')
        .ilike('code', clubCode || '')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubCode,
  });

  // Récupérer les paramètres du site avec les actualités en cache
  const { data: settings } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('cached_news, logo_url, carousel_images')
        .eq('club_id', club?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!club?.id,
  });

  // Filtrage des actualités
  const filteredNews = useMemo(() => {
    if (!settings?.cached_news) return [];
    
    return settings.cached_news.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.excerpt && item.excerpt.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.content && item.content.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [settings?.cached_news, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedNews = filteredNews.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const containerAnimation = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemAnimation = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  if (!settings || !club) return null;

  return (
    <PageLayout
      clubCode={clubCode || ''}
      title="Actualités"
      description="Restez informé des dernières nouvelles de votre aéroclub"
      backgroundImage={settings?.carousel_images?.[0]}
      club={club}
      logoUrl={settings.logo_url}
      carouselImages={settings.carousel_images}
      clubName={club.name}
    >
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher dans les actualités..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Réinitialiser la pagination lors d'une recherche
                }}
                className="pl-10 w-full"
              />
            </div>
          </div>
        </div>

        {!settings.cached_news ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : paginatedNews.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-600">
              Aucune actualité trouvée
            </h2>
            {searchTerm && (
              <p className="mt-2 text-gray-500">
                Essayez de modifier vos critères de recherche
              </p>
            )}
          </div>
        ) : (
          <>
            <motion.div
              variants={containerAnimation}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
              {paginatedNews.map((news) => (
                <motion.article
                  key={news.id}
                  variants={itemAnimation}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
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
                    <h2 className="text-xl font-semibold mb-2 line-clamp-2">
                      {news.title}
                    </h2>
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar className="w-4 h-4 mr-1" />
                      <time dateTime={news.published_at}>
                        {format(new Date(news.published_at), 'PPP', { locale: fr })}
                      </time>
                    </div>
                    {news.excerpt && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {news.excerpt}
                      </p>
                    )}
                    <Link
                      to={`/club/${clubCode}/actualites/${shortenUuid(news.id)}/${generateSlug(news.title)}`}
                      className="inline-flex items-center text-primary hover:text-primary/80"
                    >
                      Lire la suite
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </motion.article>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default NewsPage;
