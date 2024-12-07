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
  is_user_member_of_club(auth.uid(), (
    SELECT club_id 
    FROM club_members 
    WHERE user_id = student_progressions.student_id 
    LIMIT 1
  ))
);

-- Policy pour skill_validations
CREATE POLICY "Enable read access for skill validations"
ON skill_validations
FOR SELECT
TO authenticated
USING (
  instructor_id = auth.uid() -- L'instructeur peut voir ses propres validations
  OR
  is_user_member_of_club(auth.uid(), (
    SELECT club_id 
    FROM club_members cm
    JOIN student_progressions sp ON sp.student_id = cm.user_id
    WHERE sp.id = skill_validations.progression_id
    LIMIT 1
  ))
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
