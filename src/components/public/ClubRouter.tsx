import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import ClubPublicHome from './ClubPublicHome';

const ClubRouter: React.FC = () => {
  const { clubCode } = useParams<{ clubCode: string }>();
  
  console.log('ClubRouter - URL params:', useParams());
  console.log('ClubRouter - Club Code:', clubCode);

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
    <Routes>
      <Route path="*" element={<ClubPublicHome clubCode={clubCode} />} />
    </Routes>
  );
};

export default ClubRouter;
