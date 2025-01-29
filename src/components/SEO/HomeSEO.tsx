import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

const HomeSEO: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const baseUrl = window.location.origin;

  // Liste des langues supportées
  const supportedLanguages = ['fr', 'en', 'de', 'es'];

  // Obtenir les traductions pour chaque langue
  const getAlternateLanguages = () => {
    return supportedLanguages.map((lang) => ({
      hrefLang: lang,
      href: `${baseUrl}${lang === 'fr' ? '' : `?lang=${lang}`}`,
    }));
  };

  return (
    <Helmet>
      {/* Balises de base */}
      <html lang={currentLanguage} />
      <title>{t('home.meta.title')}</title>
      <meta name="description" content={t('home.meta.description')} />

      {/* Balises Open Graph */}
      <meta property="og:title" content={t('home.meta.title')} />
      <meta property="og:description" content={t('home.meta.description')} />
      <meta property="og:image" content={`${baseUrl}/images/hero-image.jpg`} />
      <meta property="og:url" content={baseUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content={currentLanguage} />

      {/* Balises Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={t('home.meta.title')} />
      <meta name="twitter:description" content={t('home.meta.description')} />
      <meta name="twitter:image" content={`${baseUrl}/images/hero-image.jpg`} />

      {/* Liens hreflang pour le SEO multilingue */}
      <link rel="canonical" href={baseUrl} />
      {getAlternateLanguages().map(({ hrefLang, href }) => (
        <link
          key={hrefLang}
          rel="alternate"
          hrefLang={hrefLang}
          href={href}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={baseUrl} />

      {/* Balises supplémentaires pour l'indexation */}
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
    </Helmet>
  );
};

export default HomeSEO;
