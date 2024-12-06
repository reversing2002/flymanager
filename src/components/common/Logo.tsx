import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <Link to="/" className={`logo-container ${className}`}>
    <div className="logo-wrapper">
      <span className="logo-number">4</span>
      <span className="logo-text">fly</span>
    </div>
    <style jsx>{`
      .logo-container {
        display: inline-flex;
        align-items: center;
      }
  
      .logo-wrapper {
        display: inline-flex;
        align-items: baseline;
        background-color: transparent;
      }
  
      .logo-number {
        font-family: 'Inter', sans-serif;
        font-weight: 800;
        font-size: 2rem;
        line-height: 1;
        color: #fff;
      }
  
      .logo-text {
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        font-size: 2rem;
        line-height: 1;
        color: #4096ff;
        margin-left: -0.05em;
      }
    `}</style>
  </Link>
  );
};