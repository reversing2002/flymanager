-- Drop existing policies
DROP POLICY IF EXISTS "Enable member read access for club members" ON users;
DROP POLICY IF EXISTS "Enable member creation for instructors" ON users;
DROP POLICY IF EXISTS "Enable member updates for instructors" ON users;
DROP POLICY IF EXISTS "Enable member deletion for admins" ON users;
DROP POLICY IF EXISTS "Enable self profile update" ON users;

-- Create helper function to check user role without recursion
CREATE OR REPLACE FUNCTION check_user_role(user_id uuid, required_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users au
    WHERE au.id = user_id 
    AND (au.raw_user_meta_data->>'role')::text = ANY(required_roles)
  );
$$;

-- Enable read access for club members
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

-- Enable member creation for instructors and admins
CREATE POLICY "Enable member creation for instructors"
ON users
FOR INSERT
WITH CHECK (
  check_user_role(auth.uid(), ARRAY['INSTRUCTOR', 'ADMIN'])
);

-- Enable member updates for instructors, admins and self
CREATE POLICY "Enable member updates for instructors"
ON users
FOR UPDATE
USING (
  -- Self update
  id = auth.uid()
  OR
  -- Instructor/Admin update for club member
  (
    check_user_role(auth.uid(), ARRAY['INSTRUCTOR', 'ADMIN'])
    AND
    EXISTS (
      SELECT 1 FROM club_members cm1
      WHERE cm1.user_id = auth.uid()
      AND cm1.club_id IN (
        SELECT club_id FROM club_members cm2
        WHERE cm2.user_id = users.id
      )
    )
  )
);

-- Enable member deletion for admins only
CREATE POLICY "Enable member deletion for admins"
ON users
FOR DELETE 
USING (
  check_user_role(auth.uid(), ARRAY['ADMIN'])
  AND
  EXISTS (
    SELECT 1 FROM club_members cm1
    WHERE cm1.user_id = auth.uid()
    AND cm1.club_id IN (
      SELECT club_id FROM club_members cm2
      WHERE cm2.user_id = users.id
    )
  )
);