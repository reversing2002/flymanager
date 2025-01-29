import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface LanguageMetadataProps {
  title: string;
  description: string;
  image?: string;
  article?: boolean;
}

const LanguageMetadata: React.FC<LanguageMetadataProps> = ({
  title,
  description,
  image = '/logo/logo.png',
  article = false,
}) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const currentLanguage = i18n.language;
  const baseUrl = window.location.origin;
  const currentUrl = `${baseUrl}${location.pathname}`;

  // Liste des langues supportées
  const supportedLanguages = ['fr', 'en', 'de', 'es'];

  return (
    <Helmet>
      {/* Balises de base */}
      <html lang={currentLanguage} />
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Balises Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${baseUrl}${image}`} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={article ? 'article' : 'website'} />
      <meta property="og:locale" content={currentLanguage} />

      {/* Balises Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${baseUrl}${image}`} />

      {/* Liens hreflang pour le SEO multilingue */}
      <link rel="canonical" href={currentUrl} />
      {supportedLanguages.map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${baseUrl}${location.pathname}${lang === 'fr' ? '' : `?lang=${lang}`}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${baseUrl}${location.pathname}`} />
    </Helmet>
  );
};

export default LanguageMetadata;
