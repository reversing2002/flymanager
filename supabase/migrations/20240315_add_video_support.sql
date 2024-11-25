-- Add video_url column to chat_messages
ALTER TABLE chat_messages 
ADD COLUMN video_url TEXT;

-- Create chat_room_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- Create storage bucket for chat videos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-videos', 'chat-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for chat videos
CREATE POLICY "Chat videos are accessible by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-videos');

CREATE POLICY "Authenticated users can upload chat videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-videos' 
  AND auth.role() = 'authenticated'
);

-- Enable RLS on chat_room_members
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

-- Add policies for chat_room_members
CREATE POLICY "Users can view members of their rooms"
ON chat_room_members FOR SELECT
USING (
  room_id IN (
    SELECT room_id FROM chat_room_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can join rooms"
ON chat_room_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- Update RLS policies for chat_messages to include video_url
DROP POLICY IF EXISTS "Users can view messages in their accessible rooms" ON chat_messages;
CREATE POLICY "Users can view messages in their accessible rooms" ON chat_messages
FOR SELECT USING (
  room_id IN (
    SELECT room_id FROM chat_room_members WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can send messages to their accessible rooms" ON chat_messages;
CREATE POLICY "Users can send messages to their accessible rooms" ON chat_messages
FOR INSERT WITH CHECK (
  room_id IN (
    SELECT room_id FROM chat_room_members WHERE user_id = auth.uid()
  )
  AND user_id = auth.uid()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);