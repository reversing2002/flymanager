-- Enable RLS
ALTER TABLE discovery_flights ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable public insert for discovery flights"
ON discovery_flights
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable read access for discovery flights"
ON discovery_flights
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable update for admins and discovery pilots"
ON discovery_flights
FOR UPDATE
TO public
USING (
  (SELECT is_member_of_group(auth.uid(), 'ADMIN') OR is_member_of_group(auth.uid(), 'DISCOVERY_PILOT'))
  OR
  (pilot_id = auth.uid())
)
WITH CHECK (
  (SELECT is_member_of_group(auth.uid(), 'ADMIN') OR is_member_of_group(auth.uid(), 'DISCOVERY_PILOT'))
  OR
  (pilot_id = auth.uid())
);

CREATE POLICY "Enable delete for admins only"
ON discovery_flights
FOR DELETE
TO public
USING (
  (SELECT is_member_of_group(auth.uid(), 'ADMIN'))
);
