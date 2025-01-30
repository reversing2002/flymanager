import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

export type PageType = 
  | 'home'
  | 'about'
  | 'contact'
  | 'faq'
  | 'features'
  | 'pricing'
  | 'legal'
  | 'cgv'
  | 'rgpd'
  | 'createClub';

interface PageSEOProps {
  pageType: PageType;
}

const PageSEO: React.FC<PageSEOProps> = ({ pageType }) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const baseUrl = 'https://4fly.io';

  // Mapping des URLs pour chaque type de page
  const pageUrls: Record<PageType, string> = {
    home: '',
    about: '/about',
    contact: '/contact',
    faq: '/faq',
    features: '/features',
    pricing: '/pricing',
    legal: '/legal',
    cgv: '/cgv',
    rgpd: '/rgpd',
    createClub: '/create-club'
  };

  // Mapping des priorités SEO pour chaque type de page
  const pagePriorities: Record<PageType, number> = {
    home: 1.0,
    pricing: 0.9,
    features: 0.9,
    about: 0.8,
    contact: 0.8,
    faq: 0.7,
    legal: 0.6,
    cgv: 0.6,
    rgpd: 0.6,
    createClub: 0.8
  };

  // Liste complète des langues supportées avec leurs codes de pays
  const languageMappings: { [key: string]: string } = {
    fr: 'fr-FR',
    en: 'en-US',
    de: 'de-DE',
    es: 'es-ES',
    it: 'it-IT',
    nl: 'nl-NL',
    pl: 'pl-PL',
    cs: 'cs-CZ',
  };

  const supportedLanguages = Object.keys(languageMappings);
  const pageUrl = pageUrls[pageType];
  const pagePriority = pagePriorities[pageType];

  // Génère les URLs alternatives pour chaque langue
  const getAlternateUrls = () => {
    return supportedLanguages.map((lang) => ({
      hrefLang: lang,
      href: `${baseUrl}/${lang}${pageUrl}`,
      fullLang: languageMappings[lang],
    }));
  };

  const alternateUrls = getAlternateUrls();
  const currentFullLang = languageMappings[currentLanguage] || currentLanguage;
  const currentUrl = `${baseUrl}/${currentLanguage}${pageUrl}`;

  // Obtient les meta données spécifiques à la page depuis les traductions
  const pageTitle = t(`${pageType}.meta.title`);
  const pageDescription = t(`${pageType}.meta.description`);
  const pageImage = t(`${pageType}.meta.image`, { defaultValue: '/images/hero-image.jpg' });

  return (
    <Helmet>
      {/* Balises de base */}
      <html lang={currentLanguage} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="index, follow" />

      {/* Balises Open Graph */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={`${baseUrl}${pageImage}`} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="4fly" />
      <meta property="og:locale" content={currentFullLang} />
      {alternateUrls
        .filter((lang) => lang.hrefLang !== currentLanguage)
        .map((lang) => (
          <meta
            key={`og-locale-${lang.hrefLang}`}
            property="og:locale:alternate"
            content={lang.fullLang}
          />
        ))}

      {/* Balises Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={`${baseUrl}${pageImage}`} />
      <meta name="twitter:site" content="@4fly" />

      {/* Liens hreflang pour le SEO multilingue */}
      <link rel="canonical" href={currentUrl} />
      <link
        rel="alternate"
        href={`${baseUrl}/fr${pageUrl}`}
        hreflang="x-default"
      />
      {alternateUrls.map((lang) => (
        <link
          key={`hreflang-${lang.hrefLang}`}
          rel="alternate"
          hreflang={lang.hrefLang}
          href={lang.href}
        />
      ))}

      {/* Balises supplémentaires pour le SEO */}
      <meta name="application-name" content="4fly" />
      <meta name="apple-mobile-web-app-title" content="4fly" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#ffffff" />
    </Helmet>
  );
};

export default PageSEO;
