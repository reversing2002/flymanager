import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { PublicHeader } from './PublicHeader';
import { PageHeader } from './PageHeader';
import { ClubFooter } from './ClubFooter';

interface PageLayoutProps {
  clubCode: string;
  clubName?: string;
  logoUrl?: string | null;
  title: string;
  description?: string;
  backgroundImage?: string;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  clubCode,
  clubName,
  logoUrl,
  title,
  description,
  backgroundImage,
  children
}) => {
  // Récupérer l'ID du club à partir de son code
  const { data: club } = useQuery({
    queryKey: ['club', clubCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id')
        .ilike('code', clubCode || '')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubCode,
  });

  // Récupérer les pages du club
  const { data: pages } = useQuery({
    queryKey: ['clubPages', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_pages')
        .select('title, slug')
        .eq('club_id', club?.id)
        .order('title');

      if (error) throw error;
      return data || [];
    },
    enabled: !!club?.id,
  });

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation Header */}
      <PublicHeader
        clubCode={clubCode}
        clubName={clubName}
        logoUrl={logoUrl}
        pages={pages}
      />

      {/* Main Content */}
      <main>
        {/* Page Header */}
        <PageHeader
          title={title}
          description={description}
          backgroundImage={backgroundImage}
        />

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      <ClubFooter />
    </div>
  );
};
