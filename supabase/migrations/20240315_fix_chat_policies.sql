-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view members of their rooms" ON chat_room_members;
DROP POLICY IF EXISTS "Users can join rooms" ON chat_room_members;
DROP POLICY IF EXISTS "Users can view messages in their accessible rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their accessible rooms" ON chat_messages;

-- Create new policies with fixed logic
CREATE POLICY "Users can view rooms in their club"
ON chat_rooms FOR SELECT
USING (
  club_id IN (
    SELECT club_id FROM club_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create rooms in their club"
ON chat_rooms FOR INSERT
WITH CHECK (
  club_id IN (
    SELECT club_id FROM club_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages in their club's rooms"
ON chat_messages FOR SELECT
USING (
  room_id IN (
    SELECT id FROM chat_rooms WHERE club_id IN (
      SELECT club_id FROM club_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can send messages to their club's rooms"
ON chat_messages FOR INSERT
WITH CHECK (
  room_id IN (
    SELECT id FROM chat_rooms WHERE club_id IN (
      SELECT club_id FROM club_members WHERE user_id = auth.uid()
    )
  )
  AND user_id = auth.uid()
);

-- Fix chat_room_members policies
CREATE POLICY "Users can view members in their club"
ON chat_room_members FOR SELECT
USING (
  room_id IN (
    SELECT id FROM chat_rooms WHERE club_id IN (
      SELECT club_id FROM club_members WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can join rooms in their club"
ON chat_room_members FOR INSERT
WITH CHECK (
  room_id IN (
    SELECT id FROM chat_rooms WHERE club_id IN (
      SELECT club_id FROM club_members WHERE user_id = auth.uid()
    )
  )
  AND user_id = auth.uid()
);

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_chat_rooms_club_id ON chat_rooms(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);