import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Editor } from '@tinymce/tinymce-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus, Pencil, Trash2, Eye, EyeOff, RefreshCw, CalendarIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { ImageUpload } from '../ui/image-upload';
import { Switch } from '../ui/switch';
import { toast } from 'react-hot-toast';
import type { ClubNews } from '../../types/news';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const newsSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  content: z.string().min(1, 'Le contenu est requis'),
  excerpt: z.string().nullable(),
  image_url: z.string().url().nullable(),
  is_published: z.boolean(),
  published_at: z.string().nullable(),
});

type NewsFormData = z.infer<typeof newsSchema>;

interface ClubNewsManagerProps {
  clubId: string;
}

export const ClubNewsManager: React.FC<ClubNewsManagerProps> = ({ clubId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingNews, setEditingNews] = useState<ClubNews | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, control, setValue, getValues } = useForm<NewsFormData>({
    resolver: zodResolver(newsSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      image_url: null,
      is_published: false,
      published_at: null,
    },
  });

  // Récupération des actualités
  const { data: news = [] } = useQuery<ClubNews[]>({
    queryKey: ['clubNews', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_news')
        .select('*')
        .eq('club_id', clubId)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fonction pour rafraîchir le cache des actualités
  const refreshNewsCacheMutation = useMutation({
    mutationFn: async () => {
      // Récupérer les 5 dernières actualités publiées avec leur contenu
      const { data: latestNews, error: newsError } = await supabase
        .from('club_news')
        .select('id, title, excerpt, content, published_at, image_url')
        .eq('club_id', clubId)
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (newsError) throw newsError;

      // Mettre à jour le cache dans club_website_settings
      const { error: updateError } = await supabase
        .from('club_website_settings')
        .update({
          cached_news: latestNews,
          updated_at: new Date().toISOString(),
        })
        .eq('club_id', clubId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubWebsiteSettings', clubId]);
      toast.success('Cache des actualités mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du cache');
    },
  });

  // Mutation pour créer/modifier une actualité
  const mutation = useMutation({
    mutationFn: async (data: NewsFormData) => {
      const newsData = {
        ...data,
        club_id: clubId,
        author_id: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (editingNews) {
        const { error } = await supabase
          .from('club_news')
          .update(newsData)
          .eq('id', editingNews.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('club_news')
          .insert({
            ...newsData,
            created_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      // Rafraîchir le cache après la modification
      await refreshNewsCacheMutation.mutateAsync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubNews', clubId]);
      toast.success(editingNews ? 'Actualité mise à jour' : 'Actualité créée');
      handleCloseForm();
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  // Suppression d'une actualité
  const deleteMutation = useMutation({
    mutationFn: async (newsId: string) => {
      const { error } = await supabase
        .from('club_news')
        .delete()
        .eq('id', newsId);
      if (error) throw error;

      // Rafraîchir le cache après la suppression
      await refreshNewsCacheMutation.mutateAsync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubNews', clubId]);
      toast.success('Actualité supprimée');
    },
  });

  const onSubmit = (data: NewsFormData) => {
    mutation.mutate(data);
  };

  const handleEdit = (news: ClubNews) => {
    setEditingNews(news);
    setShowForm(true);
    reset({
      title: news.title,
      content: news.content,
      excerpt: news.excerpt || '',
      image_url: news.image_url,
      is_published: news.is_published,
      published_at: news.published_at,
    });
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNews(null);
    reset();
  };

  const handleDelete = async (newsId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette actualité ?')) {
      deleteMutation.mutate(newsId);
    }
  };

  const togglePublishStatus = useMutation({
    mutationFn: async (news: ClubNews) => {
      const { error } = await supabase
        .from('club_news')
        .update({
          is_published: !news.is_published,
          published_at: !news.is_published ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', news.id);
      
      if (error) throw error;
      
      // Rafraîchir le cache après la modification
      await refreshNewsCacheMutation.mutateAsync();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubNews', clubId]);
      toast.success('État de publication mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const handleRefreshCache = () => {
    refreshNewsCacheMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {!showForm ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Actualités</h2>
            <div className="flex gap-2">
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle actualité
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {news.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <button
                        onClick={() => togglePublishStatus.mutate(item)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        title={item.is_published ? 'Cliquez pour dépublier' : 'Cliquez pour publier'}
                      >
                        {item.is_published ? (
                          <Eye className="w-4 h-4 text-green-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      {format(new Date(item.published_at || item.created_at), 'PPP', { locale: fr })}
                    </p>
                    {item.excerpt && (
                      <p className="mt-2 text-gray-600">{item.excerpt}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {editingNews ? 'Modifier l\'actualité' : 'Nouvelle actualité'}
            </h2>
            <Button variant="ghost" onClick={handleCloseForm}>
              Annuler
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                {...register('title')}
                placeholder="Titre de l'actualité"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 py-4">
              <Controller
                name="is_published"
                control={control}
                render={({ field }) => (
                  <>
                    <Switch
                      id="is_published"
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked && !getValues('published_at')) {
                          setValue('published_at', new Date().toISOString());
                        }
                      }}
                    />
                    <label
                      htmlFor="is_published"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {field.value ? 'Article publié' : 'Article non publié'}
                    </label>
                  </>
                )}
              />
            </div>

            <div>
              <Controller
                name="published_at"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">
                      Date de publication
                    </label>
                    <Input
                      type="date"
                      disabled={!getValues('is_published')}
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        field.onChange(date?.toISOString() || null);
                      }}
                      className="w-full"
                    />
                    {field.value && (
                      <p className="text-sm text-gray-500">
                        {format(new Date(field.value), 'dd MMMM yyyy', { locale: fr })}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>

            <div>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <Editor
                    apiKey="a2n3jmwpjgutthe8gc0w2odt7jqkh537sv261emnc52ffdgh"
                    init={{
                      height: 400,
                      menubar: false,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic forecolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | help',
                      content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                    }}
                    value={field.value}
                    onEditorChange={(content) => field.onChange(content)}
                  />
                )}
              />
              {errors.content && (
                <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>
              )}
            </div>

            <div>
              <Input
                {...register('excerpt')}
                placeholder="Extrait (optionnel)"
              />
            </div>

            <div>
              <Controller
                name="image_url"
                control={control}
                render={({ field }) => (
                  <div className="space-y-4">
                    {field.value && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group w-full h-48"
                      >
                        <img
                          src={field.value}
                          alt="Image de l'actualité"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => field.onChange(null)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                    <ImageUpload
                      onImageUpload={(url) => field.onChange(url)}
                      className="w-full h-48"
                      accept="image/*"
                      bucketName="club-website"
                    />
                  </div>
                )}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="submit"
                disabled={mutation.isLoading}
              >
                {mutation.isLoading && (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingNews ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default ClubNewsManager;
