import React from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

interface LanguageMetaTagsProps {
  path: string;
  title: string;
  description: string;
}

const LanguageMetaTags: React.FC<LanguageMetaTagsProps> = ({
  path,
  title,
  description,
}) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const baseUrl = 'https://4fly.io';

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

  const getAlternateUrls = () => {
    return supportedLanguages.map((lang) => ({
      hrefLang: lang,
      href: `${baseUrl}/${lang}${path}`,
      fullLang: languageMappings[lang],
    }));
  };

  const alternateUrls = getAlternateUrls();
  const currentFullLang = languageMappings[currentLanguage] || currentLanguage;

  return (
    <Helmet>
      {/* Balises de langue de base */}
      <html lang={currentLanguage} />
      <meta property="og:locale" content={currentFullLang} />
      
      {/* Balises alternatives pour chaque langue */}
      {alternateUrls
        .filter((lang) => lang.hrefLang !== currentLanguage)
        .map((lang) => (
          <meta
            key={`og-locale-${lang.hrefLang}`}
            property="og:locale:alternate"
            content={lang.fullLang}
          />
        ))}

      {/* Liens hreflang */}
      <link
        rel="canonical"
        href={`${baseUrl}/${currentLanguage}${path}`}
      />
      <link
        rel="alternate"
        href={`${baseUrl}/fr${path}`}
        hrefLang="x-default"
      />
      {alternateUrls.map((lang) => (
        <link
          key={`hreflang-${lang.hrefLang}`}
          rel="alternate"
          hrefLang={lang.hrefLang}
          href={lang.href}
        />
      ))}

      {/* Balises Open Graph avec langue */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`${baseUrl}/${currentLanguage}${path}`} />
    </Helmet>
  );
};

export default LanguageMetaTags;
