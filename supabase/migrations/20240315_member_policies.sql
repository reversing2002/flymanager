-- Enable read access for all club members to see other members in their club
CREATE POLICY "Enable member read access for club members"
ON users
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM club_members cm1, club_members cm2
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = users.id 
    AND cm1.club_id = cm2.club_id
  )
);

-- Enable instructors to create new members in their club
CREATE POLICY "Enable member creation for instructors"
ON users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN club_members cm ON cm.user_id = u.id
    WHERE u.id = auth.uid()
    AND u.role IN ('INSTRUCTOR', 'ADMIN')
  )
);

-- Enable instructors to update members in their club
CREATE POLICY "Enable member updates for instructors"
ON users
FOR UPDATE
USING (
  -- User belongs to same club as the instructor
  EXISTS (
    SELECT 1 FROM club_members cm1, club_members cm2
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = users.id 
    AND cm1.club_id = cm2.club_id
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('INSTRUCTOR', 'ADMIN')
    )
  )
);

-- Enable admins to delete members from their club
CREATE POLICY "Enable member deletion for admins"
ON users
FOR DELETE 
USING (
  -- User is admin and target user is in same club
  EXISTS (
    SELECT 1 FROM club_members cm1, club_members cm2
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = users.id 
    AND cm1.club_id = cm2.club_id
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'ADMIN'
    )
  )
);

-- Enable club membership management for admins and instructors
CREATE POLICY "Enable club membership management"
ON club_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('ADMIN', 'INSTRUCTOR')
    AND EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.user_id = u.id
      AND cm.club_id = club_members.club_id
    )
  )
);

-- Enable read access to qualifications for club members
CREATE POLICY "Enable qualification read access"
ON pilot_qualifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM club_members cm1, club_members cm2
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = pilot_qualifications.user_id
    AND cm1.club_id = cm2.club_id
  )
);

-- Enable qualification management for instructors and admins
CREATE POLICY "Enable qualification management"
ON pilot_qualifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN club_members cm ON cm.user_id = u.id
    WHERE u.id = auth.uid()
    AND u.role IN ('INSTRUCTOR', 'ADMIN')
    AND EXISTS (
      SELECT 1 FROM club_members cm2
      WHERE cm2.user_id = pilot_qualifications.user_id
      AND cm2.club_id = cm.club_id
    )
  )
);