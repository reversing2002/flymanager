-- Add club_id column to discovery_flights without NOT NULL constraint first
ALTER TABLE discovery_flights
ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES clubs(id);

-- Get the first club's ID to use as default
DO $$
DECLARE
    default_club_id uuid;
BEGIN
    SELECT id INTO default_club_id FROM clubs LIMIT 1;
    
    -- Update existing records to use the default club
    UPDATE discovery_flights
    SET club_id = default_club_id
    WHERE club_id IS NULL;
    
    -- Now we can add the NOT NULL constraint
    ALTER TABLE discovery_flights
    ALTER COLUMN club_id SET NOT NULL;
END $$;

-- Add foreign key constraint if not exists
ALTER TABLE discovery_flights
DROP CONSTRAINT IF EXISTS discovery_flights_club_id_fkey;

ALTER TABLE discovery_flights
ADD CONSTRAINT discovery_flights_club_id_fkey 
    FOREIGN KEY (club_id) 
    REFERENCES clubs(id)
    ON DELETE RESTRICT;
