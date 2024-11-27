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

-- Drop triggers if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documents_updated_at') THEN
        DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_document_categories_updated_at') THEN
        DROP TRIGGER IF EXISTS update_document_categories_updated_at ON public.document_categories;
    END IF;
END $$;

-- Drop function if exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop document policies if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access based on role') THEN
        DROP POLICY IF EXISTS "Enable read access based on role" ON public.documents;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users') THEN
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.documents;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable update for document owners and admins') THEN
        DROP POLICY IF EXISTS "Enable update for document owners and admins" ON public.documents;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable delete for document owners and admins') THEN
        DROP POLICY IF EXISTS "Enable delete for document owners and admins" ON public.documents;
    END IF;
END $$;

-- Drop category policies if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users') THEN
        DROP POLICY IF EXISTS "Enable read access for all users" ON public.document_categories;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable insert for authenticated users') THEN
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.document_categories;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable update for authenticated users') THEN
        DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.document_categories;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable delete for authenticated users') THEN
        DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.document_categories;
    END IF;
END $$;

-- Drop tables if they exist (order matters due to foreign key constraints)
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.document_categories CASCADE;
