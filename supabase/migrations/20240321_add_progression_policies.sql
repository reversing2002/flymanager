-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Enable read access for student progressions" ON student_progressions;
DROP POLICY IF EXISTS "Enable read access for skill validations" ON skill_validations;
DROP POLICY IF EXISTS "Enable read access for progression skills" ON progression_skills;
DROP POLICY IF EXISTS "Enable read access for progression modules" ON progression_modules;

-- Policy pour student_progressions
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
);

-- Policy pour skill_validations
CREATE POLICY "Enable read access for skill validations"
ON skill_validations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM student_progressions sp
    JOIN club_members cm_viewer ON cm_viewer.user_id = auth.uid()
    JOIN club_members cm_student ON cm_student.club_id = cm_viewer.club_id
    WHERE sp.id = skill_validations.progression_id
    AND sp.student_id = cm_student.user_id
  )
  OR instructor_id = auth.uid() -- L'instructeur peut voir ses propres validations
);

-- Policy pour progression_skills (visible par tous les utilisateurs authentifiés)
CREATE POLICY "Enable read access for progression skills"
ON progression_skills
FOR SELECT
TO authenticated
USING (true);

-- Policy pour progression_modules (visible par tous les utilisateurs authentifiés)
CREATE POLICY "Enable read access for progression modules"
ON progression_modules
FOR SELECT
TO authenticated
USING (true);
