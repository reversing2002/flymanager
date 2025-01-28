// Déclaration du type window pour TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

// Fonction de conversion Google Ads
export const gtagReportConversion = (url?: string): boolean => {
  const callback = () => {
    if (typeof(url) != 'undefined') {
      window.location.href = url;
    }
  };

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      'send_to': 'AW-1008631472/4h9rCOWwj5YaELD9-eAD',
      'event_callback': callback
    });
  }
  
  return false;
};

// Fonction pour envoyer un événement personnalisé
export const sendEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};
