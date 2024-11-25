-- Ajout de la colonne document_url à pilot_licenses
ALTER TABLE pilot_licenses 
ADD COLUMN document_url TEXT;

-- Création du bucket de stockage pour les documents de licence s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('licenses', 'licenses', true)
ON CONFLICT (id) DO NOTHING;

-- Configuration des politiques de stockage pour les documents de licence

-- Politique pour la sélection des documents de licence
CREATE POLICY "License documents are accessible by club members"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'licenses' AND
  'license-documents' = ANY(storage.foldername(name)) AND
  EXISTS (
    SELECT 1 
    FROM club_members cm1
    JOIN club_members cm2 ON cm1.club_id = cm2.club_id
    JOIN pilot_licenses pl ON cm2.user_id = pl.user_id
    WHERE cm1.user_id = auth.uid()
  )
);

-- Politique pour le téléchargement des documents de licence
CREATE POLICY "Users can upload their own license documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'licenses' AND
  'license-documents' = ANY(storage.foldername(name)) AND
  (
    EXISTS (
      SELECT 1 
      FROM users
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'INSTRUCTOR')
    )
    OR
    storage.filename(name) LIKE auth.uid() || '%'
  )
);

-- Politique pour la suppression des documents de licence
CREATE POLICY "Users can delete their own license documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'licenses' AND
  'license-documents' = ANY(storage.foldername(name)) AND
  (
    EXISTS (
      SELECT 1 
      FROM users
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'INSTRUCTOR')
    )
    OR
    storage.filename(name) LIKE auth.uid() || '%'
  )
);
