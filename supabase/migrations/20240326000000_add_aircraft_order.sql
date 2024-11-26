-- Create aircraft_order table
CREATE TABLE aircraft_order (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  aircraft_id UUID NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, aircraft_id),
  UNIQUE (club_id, position)
);

-- Add RLS policies
ALTER TABLE aircraft_order ENABLE ROW LEVEL SECURITY;

-- Only admins can manage aircraft order
CREATE POLICY "Enable aircraft order management for admins" ON aircraft_order
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
      AND users.id IN (
        SELECT user_id FROM club_members
        WHERE club_members.club_id = aircraft_order.club_id
      )
    )
  );

-- Everyone in the club can view aircraft order
CREATE POLICY "Enable read access for club members" ON aircraft_order
  FOR SELECT USING (
    club_id IN (
      SELECT club_id FROM club_members
      WHERE user_id = auth.uid()
    )
  );
