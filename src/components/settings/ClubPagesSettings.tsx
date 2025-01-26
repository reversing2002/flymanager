import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { RichTextEditor } from '../ui/rich-text-editor';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

type ClubPage = {
  id: string;
  club_id: string;
  slug: string;
  title: string;
  content: string;
};

interface ClubPagesSettingsProps {
  clubId: string;
  clubCode: string;
}

export const ClubPagesSettings: React.FC<ClubPagesSettingsProps> = ({ clubId, clubCode }) => {
  const queryClient = useQueryClient();
  const [editedPages, setEditedPages] = useState<{ [key: string]: Partial<ClubPage> }>({});

  const { data: pages, isLoading } = useQuery<ClubPage[]>({
    queryKey: ['clubPages', clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_pages')
        .select('*')
        .eq('club_id', clubId)
        .order('title');

      if (error) throw error;
      return data || [];
    },
  });

  const createPage = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('club_pages')
        .insert({
          club_id: clubId,
          title: 'Nouvelle page',
          slug: 'nouvelle-page',
          content: '',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubPages', clubId]);
      toast.success('Page créée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création de la page');
      console.error('Error creating page:', error);
    },
  });

  const updatePage = useMutation({
    mutationFn: async (page: Partial<ClubPage> & { id: string }) => {
      const { data, error } = await supabase
        .from('club_pages')
        .update(page)
        .eq('id', page.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubPages', clubId]);
      toast.success('Page mise à jour avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour de la page');
      console.error('Error updating page:', error);
    },
  });

  const deletePage = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase
        .from('club_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clubPages', clubId]);
      toast.success('Page supprimée avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression de la page');
      console.error('Error deleting page:', error);
    },
  });

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  const handleTitleChange = (pageId: string, title: string) => {
    const slug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    setEditedPages(prev => ({
      ...prev,
      [pageId]: {
        ...(prev[pageId] || {}),
        title,
        slug
      }
    }));
  };

  const handleContentChange = (pageId: string, content: string) => {
    setEditedPages(prev => ({
      ...prev,
      [pageId]: {
        ...(prev[pageId] || {}),
        content
      }
    }));
  };

  const handleSave = (pageId: string) => {
    const editedPage = editedPages[pageId];
    if (!editedPage) return;

    updatePage.mutate({ id: pageId, ...editedPage });
    setEditedPages(prev => {
      const newState = { ...prev };
      delete newState[pageId];
      return newState;
    });
  };

  const hasChanges = (pageId: string) => {
    return !!editedPages[pageId];
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pages du site</h2>
        <Button
          onClick={() => createPage.mutate()}
          disabled={createPage.isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle page
        </Button>
      </div>

      <div className="space-y-6">
        {pages?.map((page) => (
          <div key={page.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-4">
                <Input
                  value={editedPages[page.id]?.title ?? page.title}
                  onChange={(e) => handleTitleChange(page.id, e.target.value)}
                  placeholder="Titre de la page"
                  className="text-lg font-semibold"
                />
                <div className="text-sm text-muted-foreground">
                  URL: /club/{clubCode}/page/{editedPages[page.id]?.slug ?? page.slug}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleSave(page.id)}
                  disabled={!hasChanges(page.id) || updatePage.isLoading}
                >
                  <Save className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette page ?')) {
                      deletePage.mutate(page.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <RichTextEditor
              content={editedPages[page.id]?.content ?? page.content}
              onChange={(content) => handleContentChange(page.id, content)}
              className="min-h-[300px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
