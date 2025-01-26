import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useParams, Link } from 'react-router-dom';
import { Logo } from '../../common/Logo';

type ClubData = {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
};

export const ClubFooter: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();

  const { data: club } = useQuery<ClubData>({
    queryKey: ['club', clubCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, code, address, phone, email')
        .ilike('code', clubCode || '')
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!clubCode,
  });

  if (!club) return null;

  const menuItems = [
    { label: 'Accueil', href: `/club/${clubCode}` },
    { label: 'Formation', href: `/club/${clubCode}/training` },
    { label: 'Avions', href: `/club/${clubCode}/fleet` },
    { label: 'Tarifs', href: `/club/${clubCode}/tarifs` },
    { label: 'Contact', href: `/club/${clubCode}/contact` }
  ];

  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            {club.address && <p className="text-gray-300">{club.address}</p>}
            {club.phone && <p className="text-gray-300">{club.phone}</p>}
            {club.email && <p className="text-gray-300">{club.email}</p>}
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-gray-300 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Suivez-nous</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <a href="https://4fly.io" target="_blank" rel="noopener noreferrer" className="scale-75">
              <Logo disableLink />
            </a>
            <p className="text-gray-300 max-w-2xl">
              Ce site est propulsé par <a href="https://4fly.io" target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-gray-300 transition-colors">4fly</a>, la solution innovante dédiée aux aéroclubs. 
              Notre mission est de simplifier la gestion quotidienne des clubs et d'enrichir l'expérience de vol de chaque pilote. 
              De la réservation d'avions à la gestion de la maintenance, nous accompagnons les aéroclubs dans leur développement.
            </p>
          </div>
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} {club.name} | Site développé par <a href="https://4fly.io" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors">4fly</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default ClubFooter;
