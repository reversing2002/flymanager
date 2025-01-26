-- Drop existing tables and policies

-- Supprimer les triggers qui utilisent la fonction update_updated_at_column()
DROP TRIGGER IF EXISTS update_document_categories_updated_at ON document_categories;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;

DROP TRIGGER IF EXISTS update_club_website_settings_updated_at ON club_website_settings;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP POLICY IF EXISTS "Users can view their club's website settings" ON club_website_settings;
DROP POLICY IF EXISTS "Admins can update their club's website settings" ON club_website_settings;
DROP POLICY IF EXISTS "Admins can insert their club's website settings" ON club_website_settings;
DROP TABLE IF EXISTS club_website_settings;

-- Drop storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Drop storage bucket (will also delete all files in the bucket)
DROP STORAGE IF EXISTS club-website;

-- Create club_website_settings table
CREATE TABLE IF NOT EXISTS club_website_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    logo_url TEXT,
    carousel_images TEXT[],
    hero_title TEXT NOT NULL DEFAULT 'Bienvenue à l''aéroclub',
    hero_subtitle TEXT,
    cta_text TEXT NOT NULL DEFAULT 'Nous rejoindre',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(club_id)
);

-- Enable RLS
ALTER TABLE club_website_settings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their club's website settings"
    ON club_website_settings FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_website_settings.club_id
        )
    );

CREATE POLICY "Admins can update their club's website settings"
    ON club_website_settings FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_website_settings.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_website_settings.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    );

CREATE POLICY "Admins can insert their club's website settings"
    ON club_website_settings FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_website_settings.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    );

-- Create the storage bucket for club websites
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-website', 'club-website', TRUE);

-- Set up storage policy to allow public access to files
CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'club-website');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'club-website'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = (
            SELECT c.id::text
            FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            INNER JOIN clubs c ON c.id = cm.club_id
            WHERE u.auth_id = auth.uid()
            LIMIT 1
        )
    );

-- Allow users to update their own files
CREATE POLICY "Users can update their own files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'club-website'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = (
            SELECT c.id::text
            FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            INNER JOIN clubs c ON c.id = cm.club_id
            WHERE u.auth_id = auth.uid()
            LIMIT 1
        )
    );

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'club-website'
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = (
            SELECT c.id::text
            FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            INNER JOIN clubs c ON c.id = cm.club_id
            WHERE u.auth_id = auth.uid()
            LIMIT 1
        )
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_club_website_settings_updated_at
    BEFORE UPDATE ON club_website_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
