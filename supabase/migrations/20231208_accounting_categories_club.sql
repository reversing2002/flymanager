-- Create policy for INSERT operations
CREATE POLICY "Enable insert for admins" ON accounting_categories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_group_memberships ugm
    JOIN user_groups ug ON ug.id = ugm.group_id
    WHERE ugm.user_id = auth.uid()
    AND ug.name = 'ADMIN'
  )
  AND
  club_id IN (
    SELECT club_id 
    FROM club_members 
    WHERE user_id = auth.uid()
  )
);
