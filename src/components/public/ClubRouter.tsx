import React from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import ClubLayout from './layout/ClubLayout';
import ClubPublicHome from './ClubPublicHome';
import OurFleet from './pages/OurFleet';
import Training from './pages/Training';
import Events from './pages/Events';
import Contact from './pages/Contact';
import NewsPage from './pages/NewsPage';
import NewsDetail from './pages/NewsDetail';
import Pricing from './pages/Pricing';

interface ClubRouterProps {
  clubCode?: string | null;
}

const ClubRouter: React.FC<ClubRouterProps> = ({ clubCode: propClubCode }) => {
  const { clubCode: urlClubCode } = useParams<{ clubCode: string }>();
  const effectiveClubCode = propClubCode || urlClubCode;
  
  console.log('ClubRouter - Prop Club Code:', propClubCode);
  console.log('ClubRouter - URL Club Code:', urlClubCode);
  console.log('ClubRouter - Effective Club Code:', effectiveClubCode);

  // Si nous avons un clubCode en prop (sous-domaine) mais pas dans l'URL,
  // rediriger vers l'URL avec le clubCode
  if (propClubCode && !urlClubCode) {
    return <Navigate to={`/club/${propClubCode}`} replace />;
  }

  // Si nous n'avons pas de clubCode du tout, afficher un message d'erreur
  if (!effectiveClubCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Erreur</h1>
          <p className="text-gray-600">Code du club non spécifié</p>
        </div>
      </div>
    );
  }

  return (
    <ClubLayout clubCode={effectiveClubCode}>
      <Routes>
        <Route index element={<ClubPublicHome clubCode={effectiveClubCode} />} />
        <Route path="fleet" element={<OurFleet clubCode={effectiveClubCode} />} />
        <Route path="training" element={<Training clubCode={effectiveClubCode} />} />
        <Route path="events" element={<Events clubCode={effectiveClubCode} />} />
        <Route path="contact" element={<Contact clubCode={effectiveClubCode} />} />
        <Route path="news" element={<NewsPage clubCode={effectiveClubCode} />} />
        <Route path="news/:newsId/:slug" element={<NewsDetail clubCode={effectiveClubCode} />} />
        <Route path="pricing" element={<Pricing clubCode={effectiveClubCode} />} />
      </Routes>
    </ClubLayout>
  );
};

export default ClubRouter;
