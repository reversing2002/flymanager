import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { ImageUpload } from '../ui/image-upload';
import { toast } from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ClubPagesSettings } from './ClubPagesSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { ClubNewsManager } from './ClubNewsManager';
import { ClubCarouselSettings } from './ClubCarouselSettings';

const websiteSettingsSchema = z.object({
  logo_url: z.string().url().nullable(),
  carousel_images: z.array(z.string().url()),
  hero_title: z.string().min(1, 'Le titre est requis'),
  hero_subtitle: z.string().nullable(),
  cta_text: z.string().min(1, 'Le texte du bouton est requis'),
  cached_news: z.array(z.object({
    id: z.string(),
    title: z.string(),
    excerpt: z.string().nullable(),
    content: z.string().nullable(),
    published_at: z.string(),
    image_url: z.string().url().nullable(),
  })).nullable(),
  cached_club_info: z.object({
    address: z.string(),
    phone: z.string(),
    email: z.string(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  }),
  cached_fleet: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      registration: z.string(),
      image_url: z.string().nullable(),
      hourly_rate: z.number(),
      description: z.string().nullable(),
    })
  ),
  cached_instructors: z.array(
    z.object({
      id: z.string(),
      first_name: z.string(),
      last_name: z.string(),
      image_url: z.string().nullable(),
      instructor_rate: z.number().nullable()
    })
  ),
  cached_discovery_flights: z.array(
    z.object({
      id: z.string(),
      price: z.number(),
      duration: z.number(),
      features: z.array(
        z.object({
          id: z.string(),
          description: z.string(),
          display_order: z.number()
        })
      )
    })
  ),
  cached_events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      start_time: z.string(),
      end_time: z.string(),
      type: z.string(),
      visibility: z.string(),
      location: z.string().nullable(),
      image_url: z.string().nullable()
    })
  )
});

type WebsiteSettings = z.infer<typeof websiteSettingsSchema>;

interface ClubWebsiteSettingsProps {
  clubId: string;
}

const MotionDiv = motion.div;

export const ClubWebsiteSettings: React.FC<ClubWebsiteSettingsProps> = ({
  clubId,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('general');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUpdatingCache, setIsUpdatingCache] = React.useState(false);

  // Récupérer les données du club
  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, code, address, phone, email, latitude, longitude')
        .eq('id', clubId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubId
  });

  // Récupérer les pages du club
  const { data: pages } = useQuery({
    queryKey: ['club-pages', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_pages')
        .select('title, slug')
        .eq('club_id', clubId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clubId
  });

  // Récupérer les paramètres existants
  const { data: existingSettings } = useQuery({
    queryKey: ['club-website-settings', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('*')
        .eq('club_id', clubId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!clubId
  });

  const { data: settings, isLoading } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('*')
        .eq('club_id', clubId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Si les paramètres n'existent pas, créer avec les valeurs par défaut
        const { data: newSettings, error: createError } = await supabase
          .from('club_website_settings')
          .insert({
            club_id: clubId,
            logo_url: null,
            carousel_images: [],
            hero_title: 'Bienvenue à l\'aéroclub',
            hero_subtitle: null,
            cta_text: 'Nous rejoindre',
            cached_news: null,
            cached_club_info: {
              address: '',
              phone: '',
              email: '',
              latitude: null,
              longitude: null,
            },
            cached_fleet: [],
            cached_instructors: [],
            cached_discovery_flights: [],
            cached_events: []
          })
          .select()
          .single();

        if (createError) throw createError;
        return newSettings;
      }

      if (error) throw error;
      return data;
    },
    enabled: !!clubId
  });

  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<WebsiteSettings>({
    resolver: zodResolver(websiteSettingsSchema),
    defaultValues: settings,
  });

  React.useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<typeof settings>) => {
      const { data: existingSettings } = await supabase
        .from('club_website_settings')
        .select('id')
        .eq('club_id', clubId)
        .single();

      const settingsData = {
        club_id: clubId,
        ...newSettings,
      };

      if (existingSettings?.id) {
        const { data, error } = await supabase
          .from('club_website_settings')
          .update(settingsData)
          .eq('id', existingSettings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('club_website_settings')
          .insert([settingsData])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubWebsiteSettings']);
      toast.success('Paramètres sauvegardés');
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
    },
  });

  const handleLogoUpload = async (file: File) => {
    try {
      const { data, error } = await supabase.storage
        .from('club-logos')
        .upload(`${clubId}/${file.name}`, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('club-logos')
        .getPublicUrl(data.path);

      updateSettings.mutate({ logo_url: publicUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erreur lors du téléchargement du logo');
    }
  };

  const handleCarouselUpload = async (file: File) => {
    try {
      const { data, error } = await supabase.storage
        .from('carousel-images')
        .upload(`${clubId}/${file.name}`, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(data.path);

      if (settings) {
        const newImages = [...settings.carousel_images, publicUrl];
        updateSettings.mutate({ carousel_images: newImages });
      }
    } catch (error) {
      console.error('Error uploading carousel image:', error);
      toast.error('Erreur lors du téléchargement de l\'image');
    }
  };

  const removeCarouselImage = (index: number) => {
    if (settings) {
      const newImages = settings.carousel_images.filter((_, i) => i !== index);
      updateSettings.mutate({ carousel_images: newImages });
    }
  };

  const updateFleetCache = async () => {
    setIsUpdatingCache(true);
    try {
      // Récupérer les informations du club
      const { data: clubInfo } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();

      // Récupérer la flotte
      const { data: fleet } = await supabase
        .from('aircraft')
        .select('*')
        .eq('club_id', clubId)
        .eq('status', 'AVAILABLE');

      // Récupérer les instructeurs
      const { data: instructorsData } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          image_url,
          instructor_rate
        `)
        .gt('instructor_rate', 0)
        .order('last_name');

      const instructors = (instructorsData || []).map(instructor => ({
        id: instructor.id,
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        image_url: instructor.image_url,
        instructor_rate: instructor.instructor_rate
      }));

      const cachedFleet = fleet?.map(aircraft => ({
        id: aircraft.id,
        name: aircraft.name,
        type: aircraft.type,
        registration: aircraft.registration,
        image_url: aircraft.image_url,
        hourly_rate: aircraft.hourly_rate || 0,
        description: aircraft.description
      })) || [];

      const cachedInstructors = instructors?.map(instructor => ({
        id: instructor.id,
        first_name: instructor.first_name,
        last_name: instructor.last_name,
        image_url: instructor.image_url,
        instructor_rate: instructor.instructor_rate
      })) || [];

      // Récupérer la liste des vols découverte
      const { data: discoveryFlights } = await supabase
        .from('discovery_flight_prices')
        .select(`
          id,
          price,
          duration
        `)
        .eq('club_id', clubId)
        .order('price');

      // Récupérer les caractéristiques pour chaque vol découverte
      const discoveryFlightsWithFeatures = await Promise.all((discoveryFlights || []).map(async (price) => {
        const { data: featureData } = await supabase
          .from('discovery_flight_price_features')
          .select(`
            discovery_flight_features (
              id,
              description,
              display_order
            )
          `)
          .eq('price_id', price.id)
          .order('discovery_flight_features (display_order)');

        return {
          ...price,
          features: featureData?.map(item => item.discovery_flight_features) || []
        };
      }));

      // Récupérer les événements publics
      const { data: events } = await supabase
        .from('club_events')
        .select('*')
        .eq('club_id', clubId)
        .eq('visibility', 'PUBLIC')
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(10);

      // Mettre à jour le cache
      const { error: updateError } = await supabase
        .from('club_website_settings')
        .update({
          logo_url: settings.logo_url,
          carousel_images: settings.carousel_images,
          hero_title: settings.hero_title,
          hero_subtitle: settings.hero_subtitle,
          cta_text: settings.cta_text,
          cached_news: settings.cached_news,
          cached_club_info: {
            address: clubInfo?.address || '',
            phone: clubInfo?.phone || '',
            email: clubInfo?.email || '',
            latitude: clubInfo?.latitude,
            longitude: clubInfo?.longitude,
          },
          cached_fleet: cachedFleet,
          cached_instructors: cachedInstructors,
          cached_discovery_flights: discoveryFlightsWithFeatures || [],
          cached_events: events || []
        })
        .eq('club_id', clubId);

      if (updateError) throw updateError;

      toast.success('Cache mis à jour avec succès');
      queryClient.invalidateQueries(['clubWebsiteSettings']);
    } catch (error) {
      console.error('Error updating cache:', error);
      toast.error('Erreur lors de la mise à jour du cache');
    } finally {
      setIsUpdatingCache(false);
    }
  };

  const onSave = async () => {
    try {
      setIsSaving(true);

      // Récupérer la liste des avions pour le cache
      const { data: aircraft } = await supabase
        .from('aircraft')
        .select(`
          id,
          name,
          registration,
          type,
          description,
          image_url,
          hourly_rate
        `)
        .eq('club_id', clubId)
        .eq('status', 'AVAILABLE');

      const cachedFleet = aircraft?.map(aircraft => ({
        id: aircraft.id,
        name: aircraft.name,
        type: aircraft.type,
        registration: aircraft.registration,
        image_url: aircraft.image_url,
        hourly_rate: aircraft.hourly_rate || 0,
        description: aircraft.description
      })) || [];

      await updateSettings.mutateAsync({
        logo_url: settings.logo_url,
        carousel_images: settings.carousel_images || [],
        hero_title: settings.hero_title || '',
        hero_subtitle: settings.hero_subtitle || '',
        cta_text: settings.cta_text || '',
        cached_news: settings.cached_news || [],
        cached_club_info: {
          address: club?.address || '',
          phone: club?.phone || '',
          email: club?.email || '',
          latitude: club?.latitude || null,
          longitude: club?.longitude || null,
        },
        cached_fleet: cachedFleet || []
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Paramètres du site web</h2>
        <div className="flex gap-4">
          <Button
            onClick={updateFleetCache}
            disabled={isUpdatingCache}
            variant="outline"
          >
            {isUpdatingCache ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mise à jour du cache...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Mettre à jour le site Web public
              </>
            )}
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || isUpdatingCache}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder'
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="carousel">Carousel</TabsTrigger>
          <TabsTrigger value="news">Actualités</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-8">
          <MotionDiv
            key="general"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Logo du club</h3>
              <div className="space-y-4">
                {settings?.logo_url && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4"
                  >
                    <img
                      src={settings.logo_url}
                      alt="Logo du club"
                      className="h-16 w-auto object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSettings.mutate({ logo_url: null })}
                    >
                      Supprimer
                    </Button>
                  </motion.div>
                )}
                <ImageUpload
                  onUpload={handleLogoUpload}
                  className="w-32 h-32"
                  accept="image/*"
                />
                <p className="text-sm text-muted-foreground">
                  Format recommandé : PNG ou SVG, fond transparent
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit((data) => updateSettings.mutate(data))} className="space-y-8">
              <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold">Textes de la page d'accueil</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Titre principal</label>
                    <Input
                      {...register('hero_title')}
                      className="mt-1"
                      error={errors.hero_title?.message}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sous-titre</label>
                    <Textarea
                      {...register('hero_subtitle')}
                      className="mt-1"
                      error={errors.hero_subtitle?.message}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Texte du bouton d'action</label>
                    <Input
                      {...register('cta_text')}
                      className="mt-1"
                      error={errors.cta_text?.message}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold">Informations du club</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Adresse</label>
                    <Input
                      {...register('cached_club_info.address')}
                      className="mt-1"
                      error={errors.cached_club_info?.address?.message}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input
                      {...register('cached_club_info.phone')}
                      className="mt-1"
                      error={errors.cached_club_info?.phone?.message}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      {...register('cached_club_info.email')}
                      className="mt-1"
                      error={errors.cached_club_info?.email?.message}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Latitude</label>
                    <Input
                      {...register('cached_club_info.latitude')}
                      className="mt-1"
                      error={errors.cached_club_info?.latitude?.message}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Longitude</label>
                    <Input
                      {...register('cached_club_info.longitude')}
                      className="mt-1"
                      error={errors.cached_club_info?.longitude?.message}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mise à jour en cours...
                  </>
                ) : (
                  'Enregistrer les modifications'
                )}
              </Button>
            </form>
          </MotionDiv>
        </TabsContent>

        <TabsContent value="carousel">
          <MotionDiv
            key="carousel"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ClubCarouselSettings
              settings={settings}
              onUpdate={updateSettings.mutate}
              isLoading={isLoading}
            />
          </MotionDiv>
        </TabsContent>

        <TabsContent value="news">
          <MotionDiv
            key="news"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ClubNewsManager clubId={clubId} />
          </MotionDiv>
        </TabsContent>

        <TabsContent value="pages">
          <MotionDiv
            key="pages"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ClubPagesSettings clubId={clubId} />
          </MotionDiv>
        </TabsContent>
      </Tabs>
    </div>
  );
};
