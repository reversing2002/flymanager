-- Add file_url column to private_messages and chat_messages
ALTER TABLE private_messages
ADD COLUMN IF NOT EXISTS file_url text;

ALTER TABLE chat_messages  
ADD COLUMN IF NOT EXISTS file_url text;

-- Create storage buckets for message attachments
INSERT INTO storage.buckets (id, name, public) VALUES
('chat-files', 'chat-files', true),
('private-messages', 'private-messages', true);

-- Create storage policies for chat files
CREATE POLICY "Chat files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.role() = 'authenticated'
);

-- Create storage policies for private messages
CREATE POLICY "Private messages are accessible to participants"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'private-messages' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can upload private messages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'private-messages' AND
  auth.role() = 'authenticated'
);