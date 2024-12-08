-- Add club_id column to account_entry_types
ALTER TABLE account_entry_types
ADD COLUMN club_id UUID REFERENCES clubs(id);

-- Drop the existing unique constraint on code
ALTER TABLE account_entry_types
DROP CONSTRAINT IF EXISTS account_entry_types_code_key;

-- Add a new unique constraint on code + club_id
ALTER TABLE account_entry_types
ADD CONSTRAINT account_entry_types_code_club_key UNIQUE (code, club_id);

-- Create policy to only show system entries and those created by the user's club
CREATE POLICY "Show system entries and club entries" ON account_entry_types
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

-- Update admin write access policy to only allow editing their club's entries
DROP POLICY IF EXISTS "Enable write access for admins" ON account_entry_types;
CREATE POLICY "Enable write access for admins" ON account_entry_types
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
    -- Entry must belong to admin's club
    club_id IN (
      SELECT club_id 
      FROM club_members 
      WHERE user_id = auth.uid()
    )
  )
  OR 
  -- Allow admins to edit system entries if they are also marked as system admin
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

-- Enable RLS on account_entry_types
ALTER TABLE account_entry_types ENABLE ROW LEVEL SECURITY;
