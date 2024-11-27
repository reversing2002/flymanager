-- Clean up existing objects
-- Drop storage policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Enable insert access for instructors and admins" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Enable update access for instructors and admins" ON storage.objects CASCADE;
DROP POLICY IF EXISTS "Enable delete access for instructors and admins" ON storage.objects CASCADE;

-- Remove storage objects and bucket
DELETE FROM storage.objects WHERE bucket_id = 'documents';
DELETE FROM storage.buckets WHERE id = 'documents';

-- Drop triggers
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents CASCADE;
DROP TRIGGER IF EXISTS update_document_categories_updated_at ON public.document_categories CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop document policies
DROP POLICY IF EXISTS "Enable read access based on role" ON public.documents CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.documents CASCADE;
DROP POLICY IF EXISTS "Enable update for document owners and admins" ON public.documents CASCADE;
DROP POLICY IF EXISTS "Enable delete for document owners and admins" ON public.documents CASCADE;

-- Drop category policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.document_categories CASCADE;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.document_categories CASCADE;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.document_categories CASCADE;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.document_categories CASCADE;

-- Drop tables (order matters due to foreign key constraints)
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.document_categories CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create document categories table
CREATE TABLE IF NOT EXISTS public.document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES public.document_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_name_per_parent UNIQUE (name, parent_id)
);

-- Add RLS policies for document_categories
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.document_categories
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.document_categories
    FOR INSERT WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
    );

CREATE POLICY "Enable update for authenticated users" ON public.document_categories
    FOR UPDATE USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
    );

CREATE POLICY "Enable delete for authenticated users" ON public.document_categories
    FOR DELETE USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
    );

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.document_categories(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    required_role VARCHAR(50),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access based on role" ON public.documents
    FOR SELECT USING (
        CASE
            WHEN required_role IS NULL THEN true
            WHEN (SELECT role FROM public.users WHERE id = auth.uid()) = required_role THEN true
            WHEN (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN' THEN true
            ELSE false
        END
    );

CREATE POLICY "Enable insert for authenticated users" ON public.documents
    FOR INSERT WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
    );

CREATE POLICY "Enable update for document owners and admins" ON public.documents
    FOR UPDATE USING (
        auth.uid() = created_by OR
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    );

CREATE POLICY "Enable delete for document owners and admins" ON public.documents
    FOR DELETE USING (
        auth.uid() = created_by OR
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_document_categories_updated_at
    BEFORE UPDATE ON public.document_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800, -- 50MB in bytes
    ARRAY[
        'application/pdf',                     -- PDF
        'application/msword',                  -- DOC
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- DOCX
        'image/jpeg',                         -- JPEG, JPG
        'image/png',                          -- PNG
        'image/gif',                          -- GIF
        'video/mp4',                          -- MP4
        'video/quicktime',                    -- MOV
        'application/vnd.ms-excel',           -- XLS
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- XLSX
        'application/vnd.ms-powerpoint',      -- PPT
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' -- PPTX
    ]
);

-- Add storage policies
CREATE POLICY "Enable read access for authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Enable insert access for instructors and admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
);

CREATE POLICY "Enable update access for instructors and admins"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documents' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
);

CREATE POLICY "Enable delete access for instructors and admins"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
);
