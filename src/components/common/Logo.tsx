import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`logo-container ${className}`}>
    <div className="logo-wrapper">
      <span className="logo-number">4</span>
      <span className="logo-text">fly</span>
    </div>
    <style jsx>{`
      .logo-container {
        display: inline-flex;
        align-items: center;
        margin: 0.5rem; /* Ajout d'espacement autour */
      }
  
      .logo-wrapper {
        display: inline-flex;
        align-items: baseline;
        background-color: transparent;
        padding: 0.5rem 1rem; /* Ajout d'espacement interne */
      }
  
      .logo-number {
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        font-size: 2.5rem;
        line-height: 1;
        color: #fff;
      }
  
      .logo-text {
        font-family: 'Inter', sans-serif;
        font-weight: 400;
        font-size: 2.5rem;
        line-height: 1;
        color: #3b82f6;
        margin-left: -0.1em;
      }
    `}</style>
  </div>
  
  );
};