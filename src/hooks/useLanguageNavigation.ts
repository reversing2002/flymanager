import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

export const useLanguageNavigation = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const changeLanguage = async (newLanguage: string) => {
    // Changer la langue dans i18n
    await i18n.changeLanguage(newLanguage);

    // Extraire le code de langue actuel de l'URL
    const pathParts = location.pathname.split('/');
    const currentLangInUrl = pathParts[1];
    const supportedLanguages = ['fr', 'en', 'de', 'es', 'it', 'pt', 'nl', 'pl', 'cs', 'sv'];

    // Construire la nouvelle URL
    let newPath;
    if (supportedLanguages.includes(currentLangInUrl)) {
      // Si l'URL contient déjà un code de langue, le remplacer
      pathParts[1] = newLanguage;
      newPath = pathParts.join('/');
    } else {
      // Si l'URL ne contient pas de code de langue, l'ajouter
      newPath = `/${newLanguage}${location.pathname}`;
    }

    // Ajouter les paramètres de recherche s'ils existent
    if (location.search) {
      newPath += location.search;
    }

    // Naviguer vers la nouvelle URL
    navigate(newPath, { replace: true });
  };

  return { changeLanguage, currentLanguage: i18n.language };
};

export default useLanguageNavigation;
