import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicNavbar />
      <main className="flex-grow pt-16">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
