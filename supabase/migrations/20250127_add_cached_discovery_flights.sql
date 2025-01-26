-- Ajouter la colonne cached_discovery_flights à la table club_website_settings
ALTER TABLE club_website_settings
ADD COLUMN IF NOT EXISTS cached_discovery_flights JSONB DEFAULT '[]'::jsonb;

-- Ajouter un commentaire pour expliquer la structure du JSON
COMMENT ON COLUMN club_website_settings.cached_discovery_flights IS 
'Cache des vols découverte avec leurs caractéristiques. Structure:
[{
  "id": "uuid",
  "price": number,
  "duration": number,
  "features": [{
    "id": "uuid",
    "description": "string",
    "display_order": number
  }]
}]';

-- Mettre à jour les permissions RLS
ALTER TABLE club_website_settings ENABLE ROW LEVEL SECURITY;

-- Permettre la lecture publique du cache
CREATE POLICY "Permettre la lecture publique du cached_discovery_flights" ON club_website_settings
FOR SELECT
TO public
USING (true);

-- Permettre la mise à jour du cache par les administrateurs du club
CREATE POLICY "Permettre la mise à jour du cached_discovery_flights par les admins" ON club_website_settings
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_group_memberships ugm
        JOIN user_groups ug ON ugm.group_id = ug.id
        WHERE ugm.user_id = auth.uid()
        AND ug.code = 'ADMIN'
        AND ug.club_id = club_website_settings.club_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_group_memberships ugm
        JOIN user_groups ug ON ugm.group_id = ug.id
        WHERE ugm.user_id = auth.uid()
        AND ug.code = 'ADMIN'
        AND ug.club_id = club_website_settings.club_id
    )
);
