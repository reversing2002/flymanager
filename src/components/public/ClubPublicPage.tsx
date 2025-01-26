import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { RichTextContent } from '../ui/rich-text-editor';

export const ClubPublicPage: React.FC<{ clubCode: string }> = ({ clubCode }) => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ['publicPage', clubCode, slug],
    queryFn: async () => {
      // Fetch club ID first
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select('id')
        .eq('code', clubCode.toUpperCase())
        .single();

      if (clubError) throw clubError;

      // Then fetch the page using club_id and slug
      const { data, error: pageError } = await supabase
        .from('club_pages')
        .select('*')
        .eq('club_id', club.id)
        .eq('slug', slug)
        .single();

      if (pageError) throw pageError;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Page non trouvée
          </h1>
          <p className="text-gray-600">
            La page que vous recherchez n'existe pas ou a été déplacée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="pt-16">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-8">{page.title}</h1>
        <RichTextContent content={page.content} />
      </div>
    </main>
  );
};
