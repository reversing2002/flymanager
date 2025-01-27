import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import ClubPublicHome from './ClubPublicHome';
import OurFleet from './pages/OurFleet';
import Training from './pages/Training';
import Events from './pages/Events';
import Contact from './pages/Contact';
import NewsPage from './pages/NewsPage';
import NewsDetail from './pages/NewsDetail';
import DiscoveryFlightOffers from './pages/DiscoveryFlightOffers';

interface ClubRouterProps {
  clubCode?: string | null;
}

const ClubRouter: React.FC<ClubRouterProps> = ({ clubCode: propClubCode }) => {
  const params = useParams();
  const urlClubCode = params.clubCode;
  const effectiveClubCode = propClubCode || urlClubCode;
  
  console.log('ClubRouter - URL params:', params);
  console.log('ClubRouter - Prop Club Code:', propClubCode);
  console.log('ClubRouter - URL Club Code:', urlClubCode);
  console.log('ClubRouter - Effective Club Code:', effectiveClubCode);
  console.log('ClubRouter - Current Path:', window.location.pathname);

  if (!effectiveClubCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Club non spécifié</h1>
          <p className="text-gray-600">Aucun code de club n'a été fourni.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<ClubPublicHome clubCode={effectiveClubCode} />} />
      <Route path="fleet" element={<OurFleet clubCode={effectiveClubCode} />} />
      <Route path="training" element={<Training clubCode={effectiveClubCode} />} />
      <Route path="events" element={<Events clubCode={effectiveClubCode} />} />
      <Route path="contact" element={<Contact clubCode={effectiveClubCode} />} />
      <Route path="news" element={<NewsPage clubCode={effectiveClubCode} />} />
      <Route path="news/:newsId" element={<NewsDetail clubCode={effectiveClubCode} />} />
      <Route path="vol-decouverte" element={<DiscoveryFlightOffers clubCode={effectiveClubCode} />} />
    </Routes>
  );
};

export default ClubRouter;
