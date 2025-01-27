import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { ImageUpload } from "../ui/image-upload";
import { toast } from "react-hot-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ClubPagesSettings } from "./ClubPagesSettings";
import { motion } from "framer-motion";
import { ClubNewsManager } from "./ClubNewsManager";
import { ClubCarouselSettings } from "./ClubCarouselSettings";

// ---------------------------
// Schéma de validation Zod
// ---------------------------
const websiteSettingsSchema = z.object({
  logo_url: z.string().url().nullable(),
  carousel_images: z.array(z.string().url()),
  hero_title: z.string().min(1, "Le titre est requis"),
  hero_subtitle: z.string().nullable(),
  cta_text: z.string().min(1, "Le texte du bouton est requis"),
  cached_news: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        excerpt: z.string().nullable(),
        content: z.string().nullable(),
        published_at: z.string(),
        image_url: z.string().url().nullable(),
      })
    )
    .nullable(),
  cached_club_info: z
    .object({
      address: z.string(),
      phone: z.string(),
      email: z.string(),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
    })
    .optional(),
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
      instructor_rate: z.number().nullable(),
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
          display_order: z.number(),
        })
      ),
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
      // Autorise null, undefined, vide, ou un lien URL
      image_url: z
        .union([
          z.string().url(),
          z.null(),
          z.literal(""), // si vous tolérez la chaîne vide
        ])
        .optional(),
    })
  )
  
});

// Typage Typescript
type WebsiteSettings = z.infer<typeof websiteSettingsSchema>;

// Props du composant
interface ClubWebsiteSettingsProps {
  clubId: string;
}

const MotionDiv = motion.div;

export const ClubWebsiteSettings: React.FC<ClubWebsiteSettingsProps> = ({
  clubId,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("general");
  const [isSaving, setIsSaving] = React.useState(false);

  // -------------------------------------------
  // 1. Récupération des données du club
  // -------------------------------------------
  const { data: club } = useQuery({
    queryKey: ["club", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, code, address, phone, email, latitude, longitude")
        .eq("id", clubId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubId,
  });

  // -------------------------------------------
  // 2. Récupération des pages du club
  // -------------------------------------------
  const { data: pages } = useQuery({
    queryKey: ["club-pages", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_pages")
        .select("title, slug")
        .eq("club_id", clubId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clubId,
  });

  // -------------------------------------------
  // 3. Récupération des paramètres du site
  // -------------------------------------------
  const { data: existingSettings } = useQuery({
    queryKey: ["club-website-settings", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_website_settings")
        .select("*")
        .eq("club_id", clubId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!clubId,
  });

  // -------------------------------------------
  // 4. Chargement ou création des settings
  // -------------------------------------------
  const {
    data: settings,
    isLoading,
    isError,
  } = useQuery<WebsiteSettings>({
    queryKey: ["clubWebsiteSettings", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_website_settings")
        .select("*")
        .eq("club_id", clubId)
        .single();

      // Si pas de paramètres, on en crée un jeu par défaut
      if (error && error.code === "PGRST116") {
        const { data: newSettings, error: createError } = await supabase
          .from("club_website_settings")
          .insert({
            club_id: clubId,
            logo_url: null,
            carousel_images: [],
            hero_title: "Bienvenue à l'aéroclub",
            hero_subtitle: null,
            cta_text: "Nous rejoindre",
            cached_news: null,
            cached_club_info: {
              address: "",
              phone: "",
              email: "",
              latitude: null,
              longitude: null,
            },
            cached_fleet: [],
            cached_instructors: [],
            cached_discovery_flights: [],
            cached_events: [],
          })
          .select()
          .single();

        if (createError) throw createError;
        return newSettings;
      }

      if (error) throw error;
      return data;
    },
    enabled: !!clubId,
  });

  // -------------------------------------------
  // 5. Configuration du formulaire
  // -------------------------------------------
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WebsiteSettings>({
    resolver: zodResolver(websiteSettingsSchema),
    defaultValues: settings, // On appliquera un reset plus bas
  });

  // Quand settings est dispo, on reset le formulaire
  React.useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  // -------------------------------------------
  // 6. Mutation pour updater les settings
  // -------------------------------------------
  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<WebsiteSettings>) => {
      // On récupère l'enregistrement existant pour savoir s'il faut faire un update ou un insert
      const { data: existingRecord } = await supabase
        .from("club_website_settings")
        .select("id")
        .eq("club_id", clubId)
        .single();

      const settingsData = {
        club_id: clubId,
        ...newSettings,
      };

      // Update si déjà existant
      if (existingRecord?.id) {
        const { data, error } = await supabase
          .from("club_website_settings")
          .update(settingsData)
          .eq("id", existingRecord.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Sinon, on insère
        const { data, error } = await supabase
          .from("club_website_settings")
          .insert([settingsData])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["clubWebsiteSettings"]);
      toast.success("Paramètres sauvegardés");
    },
    onError: (error) => {
      console.error("Error updating settings:", error);
      toast.error("Erreur lors de la sauvegarde des paramètres");
    },
  });

  // -------------------------------------------
  // 7. Méthodes pour upload de logo / carousel
  // -------------------------------------------
  const handleLogoUpload = async (file: File) => {
    try {
      const { data, error } = await supabase.storage
        .from("club-logos")
        .upload(`${clubId}/${file.name}`, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("club-logos").getPublicUrl(data.path);

      updateSettings.mutate({ logo_url: publicUrl });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erreur lors du téléchargement du logo");
    }
  };

  const handleCarouselUpload = async (file: File) => {
    try {
      const { data, error } = await supabase.storage
        .from("carousel-images")
        .upload(`${clubId}/${file.name}`, file);

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("carousel-images").getPublicUrl(data.path);

      if (settings) {
        const newImages = [...settings.carousel_images, publicUrl];
        updateSettings.mutate({ carousel_images: newImages });
      }
    } catch (error) {
      console.error("Error uploading carousel image:", error);
      toast.error("Erreur lors du téléchargement de l'image");
    }
  };

  const removeCarouselImage = (index: number) => {
    if (settings) {
      const newImages = settings.carousel_images.filter((_, i) => i !== index);
      updateSettings.mutate({ carousel_images: newImages });
    }
  };

  // -------------------------------------------
  // 8. Soumission du formulaire
  // -------------------------------------------
  // -> Cette fonction est appelée quand on clique sur "Enregistrer les modifications"
  const onSubmit = async (data: WebsiteSettings) => {
    console.log("Formulaire valide, data:", data);
    try {
      await updateSettings.mutateAsync({
        ...settings,
        hero_title: data.hero_title,
        hero_subtitle: data.hero_subtitle,
        cta_text: data.cta_text,
      });
      toast.success("Modifications enregistrées avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde des modifications");
    }
  };

  // Callback en cas d’erreur de validation Zod / react-hook-form
  const onInvalid = (formErrors: any) => {
    console.log("Erreurs de validation:", formErrors);
  };

  // -------------------------------------------
  // 9. Bouton "Mettre à jour le site web"
  // -------------------------------------------
  // -> Indépendant du formulaire : il fait des requêtes supplémentaires
  const onSaveAndUpdate = async () => {
    try {
      setIsSaving(true);
      console.log("Mise à jour complète du site en cours...");

      // 1. Récup données en base
      const [
        { data: clubInfo },
        { data: fleet },
        { data: instructorsData },
        { data: discoveryFlights },
        { data: events },
      ] = await Promise.all([
        supabase.from("clubs").select("*").eq("id", clubId).single(),
        supabase
          .from("aircraft")
          .select("*")
          .eq("club_id", clubId)
          .eq("status", "AVAILABLE"),
        supabase
          .from("users")
          .select("id, first_name, last_name, image_url, instructor_rate")
          .gt("instructor_rate", 0)
          .order("last_name"),
        supabase
          .from("discovery_flight_prices")
          .select("id, price, duration")
          .eq("club_id", clubId)
          .order("price"),
        supabase
          .from("club_events")
          .select("*")
          .eq("club_id", clubId)
          .eq("visibility", "PUBLIC")
          .gte("end_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(10),
      ]);

      // 2. Préparer la flotte
      const cachedFleet =
        fleet?.map((aircraft) => ({
          id: aircraft.id,
          name: aircraft.name,
          type: aircraft.type,
          registration: aircraft.registration,
          image_url: aircraft.image_url,
          hourly_rate: aircraft.hourly_rate || 0,
          description: aircraft.description,
        })) || [];

      // 3. Préparer les instructeurs
      const cachedInstructors =
        instructorsData?.map((instructor) => ({
          id: instructor.id,
          first_name: instructor.first_name,
          last_name: instructor.last_name,
          image_url: instructor.image_url,
          instructor_rate: instructor.instructor_rate,
        })) || [];

      // 4. Charger les features pour chaque vol découverte
      const discoveryFlightsWithFeatures = await Promise.all(
        (discoveryFlights || []).map(async (price) => {
          const { data: featureData } = await supabase
            .from("discovery_flight_price_features")
            .select("discovery_flight_features (id, description, display_order)")
            .eq("price_id", price.id)
            .order("discovery_flight_features (display_order)");

          return {
            ...price,
            features:
              featureData?.map((item) => item.discovery_flight_features) || [],
          };
        })
      );

      // 5. Update des settings
      await updateSettings.mutateAsync({
        logo_url: settings?.logo_url,
        carousel_images: settings?.carousel_images || [],
        hero_title: settings?.hero_title || "", // ou votre form data
        hero_subtitle: settings?.hero_subtitle || "",
        cta_text: settings?.cta_text || "",
        cached_news: settings?.cached_news || [],
        cached_club_info: {
          address: clubInfo?.address || "",
          phone: clubInfo?.phone || "",
          email: clubInfo?.email || "",
          latitude: clubInfo?.latitude || null,
          longitude: clubInfo?.longitude || null,
        },
        cached_fleet: cachedFleet,
        cached_instructors: cachedInstructors,
        cached_discovery_flights: discoveryFlightsWithFeatures,
        cached_events: events || [],
        updated_at: new Date().toISOString(),
      });

      toast.success("Site web mis à jour avec succès");
      queryClient.invalidateQueries(["clubWebsiteSettings", clubId]);
    } catch (error) {
      console.error("Error updating website:", error);
      toast.error("Erreur lors de la mise à jour du site web");
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------
  // 10. Rendu du composant
  // -------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <div>Erreur de chargement des paramètres</div>;
  }

  return (
    <div className="space-y-8">
      {/* Bouton de mise à jour globale (hors formulaire) */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Paramètres du site web</h2>
        <Button onClick={onSaveAndUpdate} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mise à jour en cours...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Mettre à jour le site web
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="carousel">Carousel</TabsTrigger>
          <TabsTrigger value="news">Actualités</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        {/* ----- Onglet GENERAL ----- */}
        <TabsContent value="general" className="space-y-8">
          <MotionDiv
            key="general"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Bloc Logo */}
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

            {/* Formulaire pour Hero title / subtitle / CTA */}
            <form
              // handleSubmit prend deux callbacks : en cas de succès et d’erreurs
              onSubmit={handleSubmit(onSubmit, onInvalid)}
              className="space-y-8"
            >
              <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold">
                  Textes de la page d'accueil
                </h3>
                <div className="space-y-4">
                  {/* hero_title */}
                  <div>
                    <label className="text-sm font-medium">Titre principal</label>
                    <Input
                      {...register("hero_title")}
                      className="mt-1"
                      error={errors.hero_title?.message}
                    />
                    {errors.hero_title && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.hero_title.message}
                      </p>
                    )}
                  </div>

                  {/* hero_subtitle */}
                  <div>
                    <label className="text-sm font-medium">Sous-titre</label>
                    <Textarea
                      {...register("hero_subtitle")}
                      className="mt-1"
                      error={errors.hero_subtitle?.message}
                    />
                    {errors.hero_subtitle && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.hero_subtitle.message}
                      </p>
                    )}
                  </div>

                  {/* cta_text */}
                  <div>
                    <label className="text-sm font-medium">
                      Texte du bouton d'action
                    </label>
                    <Input
                      {...register("cta_text")}
                      className="mt-1"
                      error={errors.cta_text?.message}
                    />
                    {errors.cta_text && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.cta_text.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton de soumission du formulaire */}
              <button
                className="inline-flex items-center justify-center rounded-md text-sm font-medium
                  transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none
                  ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90
                  h-10 py-2 px-4 w-full"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mise à jour en cours...
                  </>
                ) : (
                  "Enregistrer les modifications"
                )}
              </button>
            </form>
          </MotionDiv>
        </TabsContent>

        {/* ----- Onglet CAROUSEL ----- */}
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

        {/* ----- Onglet NEWS ----- */}
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

        {/* ----- Onglet PAGES ----- */}
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
