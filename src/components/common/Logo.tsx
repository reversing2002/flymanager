import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  disableLink?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', disableLink = false }) => {
  const LogoContent = (
    <div className="rounded-lg">
      <div className="flex items-center">
        <span className="text-5xl font-bold text-white">4</span>
        <span className="text-3xl font-light text-blue-400">fly</span>
      </div>
    </div>
  );

  if (disableLink) {
    return LogoContent;
  }

  return (
    <Link to="/" className={className}>
      {LogoContent}
    </Link>
  );
};