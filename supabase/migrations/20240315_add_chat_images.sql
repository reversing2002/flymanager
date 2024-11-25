-- Add image_url column to chat_messages
ALTER TABLE chat_messages 
ADD COLUMN image_url TEXT;

-- Create storage bucket for chat images if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('chat-images', 'chat-images')
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for chat images
CREATE POLICY "Chat images are accessible by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images' 
  AND auth.role() = 'authenticated'
);