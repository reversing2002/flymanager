import React from 'react';
import { PublicHeader } from './PublicHeader';
import { PageHeader } from './PageHeader';
import { ClubFooter } from './ClubFooter';

interface PageLayoutProps {
  clubCode: string;
  clubName?: string;
  logoUrl?: string | null;
  pages?: Array<{ title: string; slug: string; }>;
  title: string;
  description?: string;
  backgroundImage?: string;
  children: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  clubCode,
  clubName,
  logoUrl,
  pages,
  title,
  description,
  backgroundImage,
  children
}) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation Header */}
      <PublicHeader
        clubCode={clubCode}
        clubName={clubName}
        logoUrl={logoUrl}
        pages={pages}
      />

      <div className="pt-16 flex-grow">
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
      </div>

      <ClubFooter />
    </div>
  );
};
