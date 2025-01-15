-- Create the contact_messages table
CREATE TABLE contact_messages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    subject text NOT NULL,
    message text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow anyone to insert messages
CREATE POLICY "Anyone can insert contact messages" ON contact_messages
    FOR INSERT WITH CHECK (true);

-- Only superadmins can view messages
CREATE POLICY "Only superadmins can view contact messages" ON contact_messages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id 
            FROM user_group_memberships 
            WHERE group_name = 'superadmin'
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
