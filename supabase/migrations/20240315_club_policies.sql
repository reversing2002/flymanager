-- Aircraft policies
CREATE POLICY "Enable read access for club members"
ON aircraft
FOR SELECT
USING (
  club_id IN (
    SELECT club_id FROM club_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Enable aircraft management for admins and mechanics"
ON aircraft
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'MECHANIC')
    AND id IN (
      SELECT user_id FROM club_members 
      WHERE club_id = aircraft.club_id
    )
  )
);

-- Flight policies
CREATE POLICY "Enable flight creation for club members"
ON flights
FOR INSERT
WITH CHECK (
  club_id IN (
    SELECT club_id FROM club_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- User is creating their own flight
    user_id = auth.uid()
    OR 
    -- Or user is an instructor creating a flight for their student
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'INSTRUCTOR'
    )
  )
);

CREATE POLICY "Enable flight updates for admins and owners"
ON flights
FOR UPDATE
USING (
  -- Flight belongs to user's club
  club_id IN (
    SELECT club_id FROM club_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- User is admin
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
    OR
    -- Or user is the flight owner
    user_id = auth.uid()
    OR
    -- Or user is the instructor for this flight
    instructor_id = auth.uid()
  )
);

CREATE POLICY "Enable flight deletion for admins only"
ON flights
FOR DELETE
USING (
  club_id IN (
    SELECT club_id FROM club_members 
    WHERE user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
  )
);

-- Reservation policies
CREATE POLICY "Enable reservation creation for club members"
ON reservations
FOR INSERT
WITH CHECK (
  club_id IN (
    SELECT club_id FROM club_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- User is creating their own reservation
    user_id = auth.uid()
    OR 
    -- Or user is an instructor creating a reservation
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'INSTRUCTOR'
    )
  )
);

CREATE POLICY "Enable reservation updates for admins and owners"
ON reservations
FOR UPDATE
USING (
  club_id IN (
    SELECT club_id FROM club_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- User is admin
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
    OR
    -- Or user is the reservation owner
    user_id = auth.uid()
    OR
    -- Or user is the instructor for this reservation
    instructor_id = auth.uid()
  )
);

CREATE POLICY "Enable reservation deletion for admins and owners"
ON reservations
FOR DELETE
USING (
  club_id IN (
    SELECT club_id FROM club_members 
    WHERE user_id = auth.uid()
  )
  AND (
    -- User is admin
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() 
      AND role = 'ADMIN'
    )
    OR
    -- Or user is the reservation owner
    user_id = auth.uid()
    OR
    -- Or user is the instructor for this reservation
    instructor_id = auth.uid()
  )
);