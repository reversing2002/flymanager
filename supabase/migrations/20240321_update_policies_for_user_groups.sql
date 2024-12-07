-- Supprimer les anciennes policies qui utilisent club_members.role
DROP POLICY IF EXISTS "Enable read access for account entries" ON account_entries;

-- Recréer les policies en utilisant user_group_membership et user_groups
CREATE POLICY "Enable read access for account entries"
ON account_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM flights f
    JOIN club_members cm ON cm.club_id = f.club_id
    JOIN user_group_memberships ugm ON ugm.user_id = auth.uid()
    JOIN user_groups ug ON ug.id = ugm.group_id
    WHERE f.id = account_entries.flight_id
    AND (
      ug.name = 'Administrateurs'
      OR (account_entries.user_id = auth.uid() AND ug.name IN ('Pilotes', 'Instructeurs'))
    )
  )
  OR account_entries.user_id = auth.uid() -- L'utilisateur peut toujours voir ses propres entrées
);
