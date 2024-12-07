-- Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "Enable read access for progression students" ON progression_students;

-- Créer la nouvelle policy qui restreint l'accès aux membres du même club
CREATE POLICY "Enable read access for progression students"
ON progression_students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM club_members cm_viewer
    JOIN club_members cm_student ON cm_student.club_id = cm_viewer.club_id
    WHERE cm_viewer.user_id = auth.uid()
    AND cm_student.user_id = progression_students.user_id
  )
);
