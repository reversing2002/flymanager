-- Add club_id and is_system columns to flight_types
ALTER TABLE flight_types
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES clubs(id),
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

-- Drop the existing unique constraint on name if it exists
ALTER TABLE flight_types
DROP CONSTRAINT IF EXISTS flight_types_name_key;

-- Add a new unique constraint on name + club_id
ALTER TABLE flight_types
ADD CONSTRAINT flight_types_name_club_key UNIQUE (name, club_id);

-- Enable RLS
ALTER TABLE flight_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Show system types and club types" ON flight_types;
DROP POLICY IF EXISTS "Enable write access for admins" ON flight_types;

-- Create policies
CREATE POLICY "Show system types and club types" ON flight_types
FOR SELECT
TO authenticated
USING (
  is_system = true OR 
  club_id IN (
    SELECT club_id 
    FROM club_members 
    WHERE user_id = auth.uid()
  )
);

-- Create admin write policy
CREATE POLICY "Enable write access for admins" ON flight_types
FOR ALL
TO authenticated
USING (
  (
    -- User must be admin
    EXISTS (
      SELECT 1
      FROM user_group_memberships ugm
      JOIN user_groups ug ON ug.id = ugm.group_id
      WHERE ugm.user_id = auth.uid()
      AND ug.name = 'ADMIN'
    )
    AND
    -- Type must belong to admin's club
    club_id IN (
      SELECT club_id 
      FROM club_members 
      WHERE user_id = auth.uid()
    )
    AND
    -- Cannot modify system types
    NOT is_system
  )
  OR 
  -- Allow system admins to edit system types
  (
    is_system = true 
    AND EXISTS (
      SELECT 1
      FROM user_group_memberships ugm
      JOIN user_groups ug ON ug.id = ugm.group_id
      WHERE ugm.user_id = auth.uid()
      AND ug.name = 'SYSTEM_ADMIN'
    )
  )
);
