import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import ClubPublicHome from './ClubPublicHome';
import OurFleet from './pages/OurFleet';
import ClubLayout from './layout/ClubLayout';

const ClubRouter: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();
  
  console.log('ClubRouter - URL params:', useParams());
  console.log('ClubRouter - Club Code:', clubCode);
  console.log('ClubRouter - Current Path:', window.location.pathname);

  if (!clubCode) {
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
    <ClubLayout>
      <Routes>
        <Route index element={<ClubPublicHome clubCode={clubCode} />} />
        <Route path="avions" element={<OurFleet />} />
        <Route path="*" element={<ClubPublicHome clubCode={clubCode} />} />
      </Routes>
    </ClubLayout>
  );
};

export default ClubRouter;
