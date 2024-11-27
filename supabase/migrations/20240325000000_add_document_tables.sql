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
