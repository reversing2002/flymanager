import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Calendar, Share2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { PageLayout } from '../layout/PageLayout';
import { motion } from 'framer-motion';
import { Button } from '../../ui/button';
import type { ClubNews } from '../../../types/news';
import { generateSlug, shortenUuid } from '../../../utils/slug';

const NewsDetail: React.FC = () => {
  const { clubCode, newsId, slug } = useParams<{ clubCode: string; newsId: string; slug: string }>();
  const navigate = useNavigate();

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
  const { data: settings } = useQuery({
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

  // Trouver l'actualité dans le cache
  const news = settings?.cached_news?.find(n => shortenUuid(n.id) === newsId);

  // Si l'actualité n'est pas dans le cache, on la récupère directement
  const { data: fullNews, isLoading } = useQuery<ClubNews>({
    queryKey: ['news', newsId],
    queryFn: async () => {
      const { data: newsData, error } = await supabase
        .from('club_news')
        .select('id, title, excerpt, content, image_url, published_at')
        .ilike('id', `${newsId}%`)
        .single();

      if (error) throw error;
      return newsData;
    },
    enabled: !!newsId && !news,
  });

  const currentNews = fullNews || news;

  // Redirection vers l'URL avec le slug correct si nécessaire
  useEffect(() => {
    if (currentNews && slug !== generateSlug(currentNews.title)) {
      navigate(`/club/${clubCode}/actualites/${shortenUuid(currentNews.id)}/${generateSlug(currentNews.title)}`, { replace: true });
    }
  }, [currentNews, slug, clubCode, newsId, navigate]);

  const handleShare = async () => {
    if (!currentNews) return;
    
    try {
      await navigator.share({
        title: currentNews.title,
        text: currentNews.excerpt,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback : copier le lien dans le presse-papier
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (!settings) {
    return null;
  }

  // Si l'actualité n'existe ni dans le cache ni dans la base, on redirige vers la liste
  if (!news && !fullNews && !isLoading) {
    navigate(`/club/${clubCode}/actualites`);
    return null;
  }

  if (!currentNews) return null;

  return (
    <PageLayout
      clubCode={clubCode || ''}
      title={currentNews.title}
      description={currentNews.excerpt || "Actualité de l'aéroclub"}
      backgroundImage={currentNews.image_url}
      club={club}
      logoUrl={settings.logo_url}
      carouselImages={settings.carousel_images}
      clubName={club.name}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <Link
            to={`/club/${clubCode}/actualites`}
            className="inline-flex items-center text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour aux actualités
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </Button>
        </div>

        <motion.article
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {currentNews.image_url && (
            <div className="relative w-full h-64 md:h-96">
              <img
                src={currentNews.image_url}
                alt={currentNews.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-sm text-gray-500 mb-6"
            >
              <Calendar className="w-4 h-4" />
              <time dateTime={currentNews.published_at}>
                {format(new Date(currentNews.published_at), 'PPP', { locale: fr })}
              </time>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div 
                className="prose prose-lg max-w-none prose-headings:text-primary prose-a:text-primary hover:prose-a:text-primary/80"
                dangerouslySetInnerHTML={{ __html: currentNews.content || '' }}
              />
            </motion.div>
          </div>
        </motion.article>
      </motion.div>
    </PageLayout>
  );
};

export default NewsDetail;
