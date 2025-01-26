-- Ajouter la colonne cached_instructor_rate à la table club_website_settings
ALTER TABLE club_website_settings
ADD COLUMN IF NOT EXISTS cached_instructor_rate INTEGER DEFAULT NULL;

COMMENT ON COLUMN club_website_settings.cached_instructor_rate IS 
'Cache du tarif horaire instructeur en euros';
