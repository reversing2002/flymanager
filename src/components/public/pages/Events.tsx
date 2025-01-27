import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Card } from '../../ui/card';
import { CalendarDays, MapPin, Clock } from 'lucide-react';
import { PageLayout } from '../layout/PageLayout';

type WebsiteSettings = {
  cached_events: Array<{
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    type: string;
    visibility: string;
    location: string | null;
    image_url: string | null;
  }>;
  carousel_images: string[];
};

const getEventTypeLabel = (type: string) => {
  const types: { [key: string]: string } = {
    'SOCIAL': 'Événement social',
    'FLIGHT': 'Vol',
    'TRAINING': 'Formation',
    'MAINTENANCE': 'Maintenance',
    'OTHER': 'Autre'
  };
  return types[type] || type;
};

const getEventTypeColor = (type: string) => {
  const colors: { [key: string]: string } = {
    'SOCIAL': 'bg-blue-100 text-blue-800',
    'FLIGHT': 'bg-green-100 text-green-800',
    'TRAINING': 'bg-yellow-100 text-yellow-800',
    'MAINTENANCE': 'bg-red-100 text-red-800',
    'OTHER': 'bg-gray-100 text-gray-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

const EventCard: React.FC<{ event: any }> = ({ event }) => {
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const isSameDay = startDate.toDateString() === endDate.toDateString();

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getEventTypeColor(event.type)}`}>
              {getEventTypeLabel(event.type)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center text-gray-600">
            <CalendarDays className="h-5 w-5 mr-2" />
            {isSameDay ? (
              <span>
                {format(startDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </span>
            ) : (
              <span>
                Du {format(startDate, 'd MMMM', { locale: fr })} au {format(endDate, 'd MMMM yyyy', { locale: fr })}
              </span>
            )}
          </div>

          <div className="flex items-center text-gray-600">
            <Clock className="h-5 w-5 mr-2" />
            <span>
              {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="text-gray-600 mt-2">{event.description}</p>
        )}
      </div>
    </Card>
  );
};

const Events: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();

  // Récupérer l'ID du club à partir de son code
  const { data: club } = useQuery({
    queryKey: ['club', clubCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name')
        .ilike('code', clubCode || '')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubCode,
  });

  // Récupérer les paramètres du site avec les événements en cache
  const { data: settings } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('cached_events, logo_url, carousel_images')
        .eq('club_id', club?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!club?.id,
  });

  const events = settings?.cached_events || [];

  return (
    <PageLayout
      clubCode={clubCode || ''}
      clubName={club?.name}
      logoUrl={settings?.logo_url}
      title="Événements à venir"
      description="Découvrez les prochains événements organisés par notre aéroclub"
      backgroundImage={settings?.carousel_images?.[0]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Introduction */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Participez à la vie de notre aéroclub</h2>
            <p className="text-lg text-gray-600 mb-8">
              Notre aéroclub organise régulièrement des événements pour ses membres et le public. 
              Des vols de découverte aux formations spécialisées, en passant par nos événements sociaux, 
              il y a toujours quelque chose d'excitant à venir !
            </p>
          </div>
        </section>

        {/* Section Types d'Événements */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <CalendarDays className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Événements Sociaux</h3>
              <p className="text-gray-600">
                Rencontrez d'autres passionnés d'aviation lors de nos barbecues, 
                journées portes ouvertes et soirées thématiques.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Vols et Formations</h3>
              <p className="text-gray-600">
                Participez à nos journées de formation spéciales, vols en groupe 
                et séances de perfectionnement.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Voyages et Rallyes</h3>
              <p className="text-gray-600">
                Découvrez de nouveaux horizons lors de nos voyages organisés 
                et participez à des rallyes aériens passionnants.
              </p>
            </div>
          </div>
        </section>

        {/* Section Événements */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Calendrier des événements</h2>
          {events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <CalendarDays className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun événement à venir pour le moment.</p>
              <p className="text-gray-500 mt-2">Revenez bientôt pour découvrir nos prochains événements !</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* Section Call-to-Action */}
        <section className="mt-16 text-center">
          <div className="bg-blue-50 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Vous souhaitez organiser un événement ?</h2>
            <p className="text-gray-600 mb-6">
              Nous sommes toujours ouverts aux suggestions de nos membres pour organiser de nouveaux événements.
              N'hésitez pas à nous contacter pour en discuter !
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors">
              Contactez-nous
            </button>
          </div>
        </section>
      </div>
    </PageLayout>
  );
};

export default Events;
