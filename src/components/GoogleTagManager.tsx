import { useEffect } from 'react';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GTAG_ID = 'AW-1008631472';

export function GoogleTagManager() {
  useEffect(() => {
    // Création du script gtag.js
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`;

    // Création du script de configuration
    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GTAG_ID}');
    `;

    // Ajout des scripts au head
    document.head.appendChild(script1);
    document.head.appendChild(script2);

    // Nettoyage lors du démontage du composant
    return () => {
      document.head.removeChild(script1);
      document.head.removeChild(script2);
    };
  }, []);

  return null;
}
