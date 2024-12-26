-- Create a new storage bucket for passenger authorizations
INSERT INTO storage.buckets (id, name, public)
VALUES ('passenger-authorizations', 'passenger-authorizations', true);

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'passenger-authorizations'
    AND (storage.foldername(name))[1] = 'authorizations'
);

-- Allow club members to read their club's files
CREATE POLICY "Allow club members to read files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'passenger-authorizations'
    AND EXISTS (
        SELECT 1 FROM discovery_flights df
        JOIN clubs c ON df.club_id = c.id
        WHERE df.id::text = (storage.foldername(name))[2]
        AND auth.jwt() ->> 'club_id'::text = c.id::text
    )
);

-- Allow club members to update their club's files
CREATE POLICY "Allow club members to update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'passenger-authorizations'
    AND EXISTS (
        SELECT 1 FROM discovery_flights df
        JOIN clubs c ON df.club_id = c.id
        WHERE df.id::text = (storage.foldername(name))[2]
        AND auth.jwt() ->> 'club_id'::text = c.id::text
    )
);

-- Allow club members to delete their club's files
CREATE POLICY "Allow club members to delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'passenger-authorizations'
    AND EXISTS (
        SELECT 1 FROM discovery_flights df
        JOIN clubs c ON df.club_id = c.id
        WHERE df.id::text = (storage.foldername(name))[2]
        AND auth.jwt() ->> 'club_id'::text = c.id::text
    )
);
