-- Drop storage policies if they exist
DO $$ 
BEGIN
    -- Drop storage policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for authenticated users') THEN
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON storage.objects;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert access for instructors and admins') THEN
        DROP POLICY IF EXISTS "Enable insert access for instructors and admins" ON storage.objects;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable update access for instructors and admins') THEN
        DROP POLICY IF EXISTS "Enable update access for instructors and admins" ON storage.objects;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable delete access for instructors and admins') THEN
        DROP POLICY IF EXISTS "Enable delete access for instructors and admins" ON storage.objects;
    END IF;
END $$;

-- Remove storage objects and bucket if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
        DELETE FROM storage.objects WHERE bucket_id = 'documents';
        DELETE FROM storage.buckets WHERE id = 'documents';
    END IF;
END $$;
