-- Ajouter les champs de texte pour la page d'accueil
ALTER TABLE club_website_settings
ADD COLUMN IF NOT EXISTS hero_title TEXT NOT NULL DEFAULT 'Bienvenue à l''aéroclub',
ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
ADD COLUMN IF NOT EXISTS cta_text TEXT NOT NULL DEFAULT 'Nous rejoindre';
