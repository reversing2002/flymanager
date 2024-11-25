-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable member read access for club members" ON users;
DROP POLICY IF EXISTS "Enable member creation for instructors" ON users;
DROP POLICY IF EXISTS "Enable member updates for instructors" ON users;
DROP POLICY IF EXISTS "Enable member deletion for admins" ON users;

-- Enable read access for club members (fixed to avoid recursion)
CREATE POLICY "Enable member read access for club members"
ON users
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.user_id = auth.uid()
    AND cm.club_id IN (
      SELECT club_id FROM club_members
      WHERE user_id = users.id
    )
  )
);

-- Enable instructors and admins to create new members
CREATE POLICY "Enable member creation for instructors"
ON users
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_members cm
    JOIN users u ON u.id = auth.uid()
    WHERE cm.user_id = auth.uid()
    AND u.role IN ('INSTRUCTOR', 'ADMIN')
  )
);

-- Enable instructors and admins to update members in their club
CREATE POLICY "Enable member updates for instructors"
ON users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM club_members cm
    JOIN users u ON u.id = auth.uid()
    WHERE cm.user_id = auth.uid()
    AND u.role IN ('INSTRUCTOR', 'ADMIN')
    AND cm.club_id IN (
      SELECT club_id FROM club_members
      WHERE user_id = users.id
    )
  )
);

-- Enable admins to delete members from their club
CREATE POLICY "Enable member deletion for admins"
ON users
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM club_members cm
    JOIN users u ON u.id = auth.uid()
    WHERE cm.user_id = auth.uid()
    AND u.role = 'ADMIN'
    AND cm.club_id IN (
      SELECT club_id FROM club_members
      WHERE user_id = users.id
    )
  )
);

-- Enable users to update their own profile
CREATE POLICY "Enable self profile update"
ON users
FOR UPDATE
USING (
  auth.uid() = id
);

-- Enable qualification management (no recursion issues here)
CREATE POLICY "Enable qualification management"
ON pilot_qualifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM club_members cm
    JOIN users u ON u.id = auth.uid()
    WHERE cm.user_id = auth.uid()
    AND u.role IN ('INSTRUCTOR', 'ADMIN')
    AND cm.club_id IN (
      SELECT club_id FROM club_members
      WHERE user_id = pilot_qualifications.user_id
    )
  )
);