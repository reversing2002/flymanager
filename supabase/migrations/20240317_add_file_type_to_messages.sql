-- Add file_type column to private_messages and chat_messages
ALTER TABLE private_messages
ADD COLUMN IF NOT EXISTS file_type text CHECK (file_type IN ('image', 'video', 'document'));

ALTER TABLE chat_messages  
ADD COLUMN IF NOT EXISTS file_type text CHECK (file_type IN ('image', 'video', 'document'));