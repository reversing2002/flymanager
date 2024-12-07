-- Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "Enable read access for student progressions" ON student_progressions;

-- Créer la nouvelle policy qui restreint l'accès aux membres du même club
CREATE POLICY "Enable read access for student progressions"
ON student_progressions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM club_members cm_viewer
    JOIN club_members cm_student ON cm_student.club_id = cm_viewer.club_id
    WHERE cm_viewer.user_id = auth.uid()
    AND cm_student.user_id = student_progressions.student_id
  )
  OR EXISTS ( -- Les instructeurs peuvent voir les progressions où ils sont validateurs
    SELECT 1
    FROM skill_validations sv
    WHERE sv.instructor_id = auth.uid()
    AND sv.progression_id = student_progressions.id
  )
);
