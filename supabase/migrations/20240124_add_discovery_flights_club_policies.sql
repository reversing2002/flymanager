-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view discovery flights from their club" ON discovery_flights;
DROP POLICY IF EXISTS "Users can insert discovery flights for their club" ON discovery_flights;
DROP POLICY IF EXISTS "Users can update discovery flights from their club" ON discovery_flights;
DROP POLICY IF EXISTS "Users can delete discovery flights from their club" ON discovery_flights;

-- Enable RLS on the discovery_flights table if not already enabled
ALTER TABLE discovery_flights ENABLE ROW LEVEL SECURITY;

-- Policy for viewing discovery flights (only from user's club)
CREATE POLICY "Users can view discovery flights from their club"
ON discovery_flights
FOR SELECT
USING (
  club_id IN (
    SELECT club_id 
    FROM club_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy for inserting discovery flights (only for user's club)
CREATE POLICY "Users can insert discovery flights for their club"
ON discovery_flights
FOR INSERT
WITH CHECK (
  club_id IN (
    SELECT club_id 
    FROM club_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy for updating discovery flights (only from user's club)
CREATE POLICY "Users can update discovery flights from their club"
ON discovery_flights
FOR UPDATE
USING (
  club_id IN (
    SELECT club_id 
    FROM club_members 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  club_id IN (
    SELECT club_id 
    FROM club_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy for deleting discovery flights (only from user's club)
CREATE POLICY "Users can delete discovery flights from their club"
ON discovery_flights
FOR DELETE
USING (
  club_id IN (
    SELECT club_id 
    FROM club_members 
    WHERE user_id = auth.uid()
  )
);
