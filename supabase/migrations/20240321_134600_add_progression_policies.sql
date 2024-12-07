-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Enable read access for student progressions" ON student_progressions;
DROP POLICY IF EXISTS "Enable read access for skill validations" ON skill_validations;
DROP POLICY IF EXISTS "Enable read access for progression skills" ON progression_skills;
DROP POLICY IF EXISTS "Enable read access for progression modules" ON progression_modules;
DROP POLICY IF EXISTS "Enable read access for user group memberships" ON user_group_memberships;

-- Policy pour user_group_memberships
CREATE POLICY "Enable read access for user group memberships"
ON user_group_memberships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() -- L'utilisateur peut toujours voir ses propres groupes
  OR 
  EXISTS ( -- Ou s'il est dans le même club
    SELECT 1 
    FROM club_members viewer
    WHERE viewer.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM club_members target 
      WHERE target.club_id = viewer.club_id
      AND target.user_id = user_group_memberships.user_id
    )
  )
);

-- Policy pour student_progressions
CREATE POLICY "Enable read access for student progressions"
ON student_progressions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM club_members viewer
    WHERE viewer.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM club_members student
      WHERE student.club_id = viewer.club_id
      AND student.user_id = student_progressions.student_id
    )
  )
);

-- Policy pour skill_validations
CREATE POLICY "Enable read access for skill validations"
ON skill_validations
FOR SELECT
TO authenticated
USING (
  instructor_id = auth.uid() -- L'instructeur peut voir ses propres validations
  OR
  EXISTS (
    SELECT 1 
    FROM club_members viewer
    WHERE viewer.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 
      FROM club_members student
      JOIN student_progressions sp ON sp.student_id = student.user_id
      WHERE student.club_id = viewer.club_id
      AND sp.id = skill_validations.progression_id
    )
  )
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
