-- Add is_support_request and user_id columns to contact_messages
ALTER TABLE contact_messages 
ADD COLUMN is_support_request boolean DEFAULT false,
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Add index on is_support_request for faster filtering
CREATE INDEX idx_contact_messages_is_support_request ON contact_messages(is_support_request);

-- Add index on user_id for faster lookups
CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id);
