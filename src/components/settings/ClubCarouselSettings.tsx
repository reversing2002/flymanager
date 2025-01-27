import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUpload } from '../ui/image-upload';
import { Button } from '../ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const MotionDiv = motion.div;

interface ClubCarouselSettingsProps {
  settings: {
    carousel_images: string[];
  };
  onUpdate: (newSettings: { carousel_images: string[] }) => void;
  isLoading?: boolean;
}

export const ClubCarouselSettings: React.FC<ClubCarouselSettingsProps> = ({
  settings,
  onUpdate,
  isLoading = false,
}) => {
  const handleImageUpload = async (url: string) => {
    try {
      const newImages = [...settings.carousel_images, url];
      onUpdate({ carousel_images: newImages });
      toast.success('Image ajoutée au carousel');
    } catch (error) {
      console.error('Error uploading carousel image:', error);
      toast.error('Erreur lors de l\'upload de l\'image');
    }
  };

  const removeImage = async (index: number) => {
    try {
      // Extraire le nom du fichier de l'URL
      const url = settings.carousel_images[index];
      const filePath = url.split('club-website/')[1];

      if (filePath) {
        // Supprimer le fichier du stockage
        const { error: deleteError } = await supabase.storage
          .from('club-website')
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      // Mettre à jour la liste des images
      const newImages = settings.carousel_images.filter((_, i) => i !== index);
      onUpdate({ carousel_images: newImages });
      toast.success('Image supprimée du carousel');
    } catch (error) {
      console.error('Error removing carousel image:', error);
      toast.error('Erreur lors de la suppression de l\'image');
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
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Images du carousel</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {settings.carousel_images.map((url, index) => (
                <MotionDiv
                  key={url}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group"
                >
                  <img
                    src={url}
                    alt={`Image carousel ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </MotionDiv>
              ))}
            </AnimatePresence>
          </div>
          <ImageUpload
            onImageUpload={handleImageUpload}
            className="w-full h-48"
            accept="image/*"
            bucketName="club-website"
          />
          <p className="text-sm text-muted-foreground">
            Format recommandé : 1920x1080px, JPG ou PNG
          </p>
        </div>
      </div>
    </div>
  );
};
