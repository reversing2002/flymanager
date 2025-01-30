import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Liste des routes publiques qui doivent être préfixées par la langue
const PUBLIC_ROUTES = [
  '',  // route racine
  'about',
  'contact',
  'pricing',
  'features',
  'legal',
  'rgpd',
  'cgv',
  'faq',
  'news',
  'login',
  'reset-password',
  'update-password',
  'create-club'
];

export const useLanguageRedirect = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPathPart = pathParts[0];
    const secondPathPart = pathParts[1];
    const supportedLanguages = ['fr', 'en', 'de', 'es', 'it', 'pt'];
    
    // Ne rien faire si nous sommes déjà sur le bon chemin
    if (firstPathPart === i18n.language) {
      return;
    }

    // Vérifier si c'est une route publique qui doit être traduite
    const isPublicRoute = PUBLIC_ROUTES.some(route => {
      const currentPath = location.pathname === '/' ? '' : (supportedLanguages.includes(firstPathPart) ? secondPathPart : firstPathPart);
      return currentPath === route;
    });

    if (isPublicRoute) {
      if (!supportedLanguages.includes(firstPathPart)) {
        // Si pas de langue dans l'URL, ajouter la langue courante
        const basePath = location.pathname === '/' ? '' : location.pathname;
        const newPath = `/${i18n.language}${basePath}`;
        if (newPath !== location.pathname) {
          navigate(newPath, { replace: true });
        }
      } else if (firstPathPart !== i18n.language) {
        // Si mauvaise langue, remplacer par la langue courante
        const restPath = pathParts.slice(1).join('/');
        const newPath = `/${i18n.language}/${restPath}`;
        if (newPath !== location.pathname) {
          navigate(newPath, { replace: true });
        }
      }
    } else if (supportedLanguages.includes(firstPathPart)) {
      // Si ce n'est pas une route publique mais qu'elle a un préfixe de langue, on le retire
      const newPath = '/' + pathParts.slice(1).join('/');
      if (newPath !== location.pathname) {
        navigate(newPath, { replace: true });
      }
    }
  }, [location.pathname, i18n.language, navigate]);
}

export default useLanguageRedirect;
