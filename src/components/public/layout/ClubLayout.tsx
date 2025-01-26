import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/button';

interface ClubLayoutProps {
  children: React.ReactNode;
}

interface ClubData {
  id: string;
  name: string;
  code: string;
}

interface WebsiteSettings {
  logo_url: string | null;
}

interface ClubPage {
  id: string;
  slug: string;
  title: string;
}

const ClubLayout: React.FC<ClubLayoutProps> = ({ children }) => {
  const { clubCode } = useParams<{ clubCode: string }>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch club data
  const { data: club } = useQuery<ClubData>({
    queryKey: ['publicClub', clubCode],
    queryFn: async () => {
      if (!clubCode) return null;
      const upperClubCode = clubCode.toUpperCase();
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, code')
        .eq('code', upperClubCode)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubCode,
  });

  // Fetch club website settings
  const { data: websiteSettings } = useQuery<WebsiteSettings>({
    queryKey: ['clubWebsiteSettings', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_website_settings')
        .select('logo_url')
        .eq('club_id', club?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || { logo_url: null };
    },
    enabled: !!club?.id,
  });

  // Fetch club pages
  const { data: pages } = useQuery<ClubPage[]>({
    queryKey: ['clubPages', club?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_pages')
        .select('id, slug, title')
        .eq('club_id', club?.id)
        .order('title');

      if (error) throw error;
      return data || [];
    },
    enabled: !!club?.id,
  });

  const menuItems = [
    { label: 'Accueil', href: `/club/${clubCode}` },
    { label: 'Formation', href: `/club/${clubCode}/formation` },
    { label: 'Avions', href: `/club/${clubCode}/avions` },
    { label: 'Tarifs', href: `/club/${clubCode}/tarifs` },
    { label: 'Contact', href: `/club/${clubCode}/contact` },
    ...(pages?.map(page => ({
      label: page.title,
      href: `/club/${clubCode}/page/${page.slug}`
    })) || [])
  ];

  if (!clubCode || !club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Erreur</h2>
          <p className="text-gray-600">Code du club non spécifié</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo and club name */}
            <Link to={`/club/${clubCode}`} className="flex items-center gap-2">
              {websiteSettings?.logo_url && (
                <img
                  src={websiteSettings.logo_url}
                  alt={club?.name}
                  className="h-8 w-auto"
                />
              )}
              <span className="font-semibold text-lg">{club?.name}</span>
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild variant="default">
                <Link to={`/club/${clubCode}/rejoindre`}>
                  Nous rejoindre
                </Link>
              </Button>
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden border-t">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <div className="flex flex-col gap-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="py-2 text-gray-600 hover:text-gray-900 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Button asChild variant="default" className="mt-2">
                  <Link 
                    to={`/club/${clubCode}/rejoindre`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Nous rejoindre
                  </Link>
                </Button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main content with padding for fixed header */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
};

export default ClubLayout;
