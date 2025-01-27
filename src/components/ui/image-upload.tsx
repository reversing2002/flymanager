import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { Loader2, Upload } from 'lucide-react';
import { Slider } from './slider';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface ImageUploadProps {
  onImageUpload: (url: string) => Promise<void>;
  bucketName: string;
  aspectRatio?: number;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  accept?: string;
  children?: React.ReactNode;
}

export function ImageUpload({
  onImageUpload,
  bucketName,
  aspectRatio,
  maxWidth = 1920,
  maxHeight = 1080,
  className,
  accept = 'image/*',
  children
}: ImageUploadProps) {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setIsDialogOpen(true);
        
        // Charger l'image pour obtenir ses dimensions originales
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { [accept]: [] },
    multiple: false
  });

  const resizeImage = (img: HTMLImageElement): { width: number; height: number } => {
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const ratio = width / height;

    // Redimensionner en respectant le ratio d'aspect souhaité si spécifié
    if (aspectRatio) {
      const targetRatio = aspectRatio;
      if (ratio > targetRatio) {
        // Image trop large
        width = height * targetRatio;
      } else if (ratio < targetRatio) {
        // Image trop haute
        height = width / targetRatio;
      }
    }

    // Réduire si l'image dépasse les dimensions maximales
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    return { width, height };
  };

  const processImage = async (): Promise<void> => {
    if (!originalImage || !canvasRef.current) throw new Error('No image loaded');

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2d context');

    // Obtenir les dimensions finales
    const { width, height } = resizeImage(originalImage);
    
    // Créer un canvas aux dimensions cibles
    canvas.width = width;
    canvas.height = height;

    // Dessiner l'image redimensionnée
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(
      originalImage,
      0, 0, originalImage.naturalWidth, originalImage.naturalHeight,
      0, 0, width * scale, height * scale
    );
  };

  const handleComplete = async () => {
    if (!selectedImage || !canvasRef.current) return;

    try {
      setIsUploading(true);
      
      // Convertir le canvas en blob
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((blob) => {
          if (!blob) throw new Error('Failed to create blob');
          resolve(blob);
        }, 'image/png');
      });

      // Vérifier que le club_id est disponible
      const clubId = user?.club?.id;
      if (!clubId) throw new Error('Club ID not found');
      
      // Créer un nom de fichier unique dans le dossier du club
      const fileExt = 'png';
      const fileName = `${clubId}/${Date.now()}.${fileExt}`;

      // Upload vers Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Appeler le callback avec l'URL
      await onImageUpload(publicUrl);
      
      setIsDialogOpen(false);
      setSelectedImage(null);
      setScale(1);
      toast.success("Image téléchargée avec succès");
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (selectedImage && originalImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Définir les dimensions du canvas
      const { width, height } = resizeImage(originalImage);
      canvas.width = width;
      canvas.height = height;

      // Dessiner l'image avec l'échelle actuelle
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(
        originalImage,
        0, 0, originalImage.naturalWidth, originalImage.naturalHeight,
        0, 0, width * scale, height * scale
      );
    }
  }, [selectedImage, originalImage, scale]);

  return (
    <>
      <div
        {...getRootProps()}
        className={`${className} cursor-pointer border-2 border-dashed rounded-lg p-4 transition-colors ${
          isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        {children || (
          <div className="flex flex-col items-center justify-center gap-2 text-sm text-gray-600">
            <Upload className="h-8 w-8" />
            <p>Glissez une image ici ou cliquez pour en sélectionner une</p>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Redimensionner l'image</DialogTitle>
            <DialogDescription>
              Ajustez la taille de l'image en utilisant le curseur ci-dessous
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="flex flex-col gap-4">
              <div className="max-h-[60vh] overflow-auto">
                <div className="space-y-4">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto mx-auto border rounded bg-white"
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Échelle: {Math.round(scale * 100)}%
                    </label>
                    <Slider
                      value={[scale]}
                      min={0.1}
                      max={2}
                      step={0.1}
                      onValueChange={([value]) => setScale(value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setSelectedImage(null);
                  }}
                  className="text-gray-100"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={isUploading}
                  className="text-gray-100"
                >
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Valider
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
