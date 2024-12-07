-- Supprimer l'ancienne policy de lecture
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;

-- Créer la nouvelle policy qui restreint l'accès aux membres du même club
CREATE POLICY "Users can only view members of their clubs"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM club_members viewer
    JOIN club_members target ON target.club_id = viewer.club_id
    WHERE viewer.user_id = auth.uid()
    AND target.user_id = users.id
  )
  OR id = auth.uid() -- L'utilisateur peut toujours voir son propre profil
);
