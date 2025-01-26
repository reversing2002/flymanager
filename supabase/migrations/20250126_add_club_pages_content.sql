-- Create club pages table
CREATE TABLE IF NOT EXISTS club_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(club_id, slug)
);

-- Enable RLS
ALTER TABLE club_pages ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Public can view club pages"
    ON club_pages FOR SELECT
    USING (true);

CREATE POLICY "Admins can update their club's pages"
    ON club_pages FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_pages.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_pages.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    );

CREATE POLICY "Admins can insert their club's pages"
    ON club_pages FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_pages.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    );

CREATE POLICY "Admins can delete their club's pages"
    ON club_pages FOR DELETE
    USING (
        auth.uid() IN (
            SELECT auth_id FROM users u
            INNER JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = club_pages.club_id
            AND has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        )
    );

-- Add trigger for updated_at
CREATE TRIGGER update_club_pages_updated_at
    BEFORE UPDATE ON club_pages
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
