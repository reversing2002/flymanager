import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { toast } from 'react-hot-toast';
import { Mail, Phone, MapPin } from 'lucide-react';
import { PageLayout } from '../layout/PageLayout';

const MAPTILER_KEY = '869VdTVYvYcrnGVilpTn';
maptilersdk.config.apiKey = MAPTILER_KEY;

type ContactFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type ClubData = {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  cached_club_info: {
    address: string;
    phone: string;
    email: string;
    latitude: number | null;
    longitude: number | null;
  };
  logo_url: string | null;
  pages: Array<{ title: string; slug: string; }>;
};

export const Contact: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const marker = useRef<maptilersdk.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>();

  const { data: club } = useQuery<ClubData>({
    queryKey: ['club-settings', clubCode],
    queryFn: async () => {
      // Get club basic info
      const { data: clubData, error } = await supabase
        .from('clubs')
        .select('id, name, code, address, phone, email, latitude, longitude')
        .ilike('code', clubCode || '')
        .single();

      if (error) throw error;

      // Get club pages
      const { data: pages, error: pagesError } = await supabase
        .from('club_pages')
        .select('title, slug')
        .eq('club_id', clubData.id);

      if (pagesError) throw pagesError;

      // Get website settings
      const { data: settings, error: settingsError } = await supabase
        .from('club_website_settings')
        .select('logo_url')
        .eq('club_id', clubData.id)
        .single();

      if (settingsError) throw settingsError;

      return {
        ...clubData,
        logo_url: settings.logo_url,
        cached_club_info: {
          address: clubData.address || '',
          phone: clubData.phone || '',
          email: clubData.email || '',
          latitude: clubData.latitude || null,
          longitude: clubData.longitude || null,
        },
        pages: pages || []
      };
    },
    enabled: !!clubCode,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: club?.cached_club_info?.email,
          subject: `[Contact ${club?.name}] ${data.subject}`,
          content: `
            <h2>Nouveau message de contact - ${club?.name}</h2>
            <p><strong>De :</strong> ${data.name} (${data.email})</p>
            <p><strong>Sujet :</strong> ${data.subject}</p>
            <p><strong>Message :</strong></p>
            <p>${data.message.replace(/\n/g, '<br/>')}</p>
          `
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Une erreur est survenue lors de l\'envoi du message');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Votre message a bien été envoyé !');
      reset();
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsSubmitting(false);
    }
  });

  const onSubmit = (data: ContactFormData) => {
    setIsSubmitting(true);
    sendEmailMutation.mutate(data);
  };

  // Initialisation de la carte
  useEffect(() => {
    if (!mapContainer.current || !club?.cached_club_info?.latitude || !club?.cached_club_info?.longitude || mapLoaded) return;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: maptilersdk.MapStyle.STREETS,
      center: [club.cached_club_info.longitude, club.cached_club_info.latitude],
      zoom: 13
    });

    marker.current = new maptilersdk.Marker({ color: '#0ea5e9' })
      .setLngLat([club.cached_club_info.longitude, club.cached_club_info.latitude])
      .addTo(map.current);

    setMapLoaded(true);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [club, mapLoaded]);

  if (!club) return null;

  return (
    <PageLayout
      clubCode={club.code}
      clubName={club.name}
      logoUrl={club.logo_url}
      pages={club.pages}
      title="Contact"
      description="Contactez-nous pour toute question concernant notre aéroclub"
    >
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Formulaire de contact */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Envoyez-nous un message</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <Input
                  id="name"
                  type="text"
                  {...register('name', { required: 'Le nom est requis' })}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', {
                    required: 'L\'email est requis',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email invalide'
                    }
                  })}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet
                </label>
                <Input
                  id="subject"
                  type="text"
                  {...register('subject', { required: 'Le sujet est requis' })}
                  className={errors.subject ? 'border-red-500' : ''}
                />
                {errors.subject && (
                  <p className="text-red-500 text-sm mt-1">{errors.subject.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <Textarea
                  id="message"
                  rows={5}
                  {...register('message', { required: 'Le message est requis' })}
                  className={errors.message ? 'border-red-500' : ''}
                />
                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={sendEmailMutation.isLoading || isSubmitting}
              >
                {sendEmailMutation.isLoading || isSubmitting ? 'Envoi en cours...' : 'Envoyer le message'}
              </Button>
            </form>
          </div>

          {/* Informations de contact et carte */}
          <div className="space-y-8">
            {/* Informations de contact */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-semibold mb-6">Nos coordonnées</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Adresse</h3>
                    <p className="text-gray-600 mt-1">{club.cached_club_info.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Phone className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Téléphone</h3>
                    <p className="text-gray-600 mt-1">
                      <a href={`tel:${club.cached_club_info.phone}`} className="hover:text-blue-500 transition-colors">
                        {club.cached_club_info.phone}
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <Mail className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-medium text-gray-900">Email</h3>
                    <p className="text-gray-600 mt-1">
                      <a href={`mailto:${club.cached_club_info.email}`} className="hover:text-blue-500 transition-colors">
                        {club.cached_club_info.email}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Carte */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-semibold mb-6">Comment nous trouver</h2>
              <div 
                ref={mapContainer} 
                className="w-full h-[400px] rounded-lg overflow-hidden"
              />
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 mb-2">Accès par la route</h3>
                <p className="text-gray-600">
                  Vous pouvez nous trouver facilement en suivant les indications vers l'aérodrome. 
                  Un parking gratuit est disponible sur place.
                </p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${club.cached_club_info.latitude},${club.cached_club_info.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-500 hover:text-blue-600 mt-2"
                >
                  Obtenir l'itinéraire sur Google Maps
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Contact;
