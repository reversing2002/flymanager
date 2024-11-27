-- Restaurer les anciennes politiques pour document_categories
DROP POLICY IF EXISTS "Enable read access for club members" ON public.document_categories;
DROP POLICY IF EXISTS "Enable insert for club admins and instructors" ON public.document_categories;
DROP POLICY IF EXISTS "Enable update for club admins and instructors" ON public.document_categories;
DROP POLICY IF EXISTS "Enable delete for club admins and instructors" ON public.document_categories;

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

-- Restaurer les anciennes politiques pour documents
DROP POLICY IF EXISTS "Enable read access for club members with role" ON public.documents;
DROP POLICY IF EXISTS "Enable insert for club admins and instructors" ON public.documents;
DROP POLICY IF EXISTS "Enable update for club document owners and admins" ON public.documents;
DROP POLICY IF EXISTS "Enable delete for club document owners and admins" ON public.documents;

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

-- Supprimer les colonnes club_id
ALTER TABLE public.documents DROP COLUMN club_id;
ALTER TABLE public.document_categories DROP COLUMN club_id;
