import React from 'react';
import { useForm } from 'react-hook-form';
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

const websiteSettingsSchema = z.object({
  logo_url: z.string().url().nullable(),
  carousel_images: z.array(z.string().url()),
  hero_title: z.string().min(1, 'Le titre est requis'),
  hero_subtitle: z.string().nullable(),
  cta_text: z.string().min(1, 'Le texte du bouton est requis'),
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

  const { data: settings, isLoading } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('*')
        .eq('club_id', clubId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return (
        data || {
          logo_url: null,
          carousel_images: [],
          hero_title: 'Bienvenue à l\'aéroclub',
          hero_subtitle: null,
          cta_text: 'Nous rejoindre',
          cached_fleet: [],
        }
      );
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<WebsiteSettings>({
    resolver: zodResolver(websiteSettingsSchema),
    defaultValues: settings,
  });

  React.useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<WebsiteSettings>) => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .upsert({
          club_id: clubId,
          ...newSettings,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubWebsiteSettings', clubId]);
      toast.success('Paramètres mis à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour des paramètres');
      console.error('Error updating settings:', error);
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
    try {
      setIsUpdatingCache(true);

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
        .eq('status', 'AVAILABLE')
        ;

      const cachedFleet = aircraft?.map(aircraft => ({
        id: aircraft.id,
        name: aircraft.name,
        type: aircraft.type,
        registration: aircraft.registration,
        image_url: aircraft.image_url,
        hourly_rate: aircraft.hourly_rate || 0,
        description: aircraft.description
      })) || [];

      // Mettre à jour le cache dans les paramètres
      const { error: updateError } = await supabase
        .from('club_website_settings')
        .update({ cached_fleet: cachedFleet })
        .eq('club_id', clubId);

      if (updateError) throw updateError;

      toast.success('Cache de la flotte mis à jour');
      queryClient.invalidateQueries(['clubWebsiteSettings']);
    } catch (error) {
      console.error('Error updating fleet cache:', error);
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
        .eq('club_id', clubId);

      const cachedFleet = aircraft?.map(aircraft => ({
        id: aircraft.id,
        name: aircraft.name,
        type: aircraft.type,
        registration: aircraft.registration,
        image_url: aircraft.image_url,
        hourly_rate: aircraft.hourly_rate || 0,
        description: aircraft.description
      })) || [];

      const { error } = await supabase
        .from('club_website_settings')
        .upsert({
          club_id: clubId,
          logo_url: settings.logo_url,
          carousel_images: settings.carousel_images,
          hero_title: settings.hero_title,
          hero_subtitle: settings.hero_subtitle,
          cta_text: settings.cta_text,
          cached_fleet: cachedFleet
        });

      if (error) throw error;

      toast.success('Paramètres sauvegardés');
      queryClient.invalidateQueries(['clubWebsiteSettings']);
    } catch (error) {
      console.error('Error saving website settings:', error);
      toast.error('Erreur lors de la sauvegarde des paramètres');
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
                Mettre à jour la flotte
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
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <MotionDiv
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="general" className="space-y-8">
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
                  <h3 className="text-lg font-semibold">Images du carrousel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {settings?.carousel_images.map((image, index) => (
                        <motion.div
                          key={image}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="relative group"
                        >
                          <img
                            src={image}
                            alt={`Carousel ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeCarouselImage(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <ImageUpload
                      onUpload={handleCarouselUpload}
                      className="w-full h-48"
                      accept="image/*"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Format recommandé : 1920x1080px, ratio 16:9
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateSettings.isLoading}
                >
                  {updateSettings.isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Enregistrer les modifications
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="pages">
              <ClubPagesSettings clubId={clubId} />
            </TabsContent>
          </MotionDiv>
        </AnimatePresence>
      </Tabs>
    </div>
  );
};
