-- Vérifier que la table clubs existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clubs') THEN
        CREATE TABLE public.clubs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

-- Ajouter le champ club_id aux tables s'il n'existe pas déjà
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'document_categories' 
                  AND column_name = 'club_id') THEN
        ALTER TABLE public.document_categories
        ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'documents' 
                  AND column_name = 'club_id') THEN
        ALTER TABLE public.documents
        ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Mettre à jour les politiques pour document_categories
DROP POLICY IF EXISTS "Enable read access for all users" ON public.document_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.document_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.document_categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.document_categories;

CREATE POLICY "Enable read access for club members" ON public.document_categories
    FOR SELECT USING (
        club_id IN (
            SELECT cm.club_id 
            FROM public.club_members cm
            WHERE cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Enable insert for club admins and instructors" ON public.document_categories
    FOR INSERT WITH CHECK (
        club_id IN (
            SELECT cm.club_id 
            FROM public.club_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('ADMIN', 'INSTRUCTOR')
        )
    );

CREATE POLICY "Enable update for club admins and instructors" ON public.document_categories
    FOR UPDATE USING (
        club_id IN (
            SELECT cm.club_id 
            FROM public.club_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('ADMIN', 'INSTRUCTOR')
        )
    );

CREATE POLICY "Enable delete for club admins and instructors" ON public.document_categories
    FOR DELETE USING (
        club_id IN (
            SELECT cm.club_id 
            FROM public.club_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('ADMIN', 'INSTRUCTOR')
        )
    );

-- Mettre à jour les politiques pour documents
DROP POLICY IF EXISTS "Enable read access based on role" ON public.documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.documents;
DROP POLICY IF EXISTS "Enable update for document owners and admins" ON public.documents;
DROP POLICY IF EXISTS "Enable delete for document owners and admins" ON public.documents;

CREATE POLICY "Enable read access for club members with role" ON public.documents
    FOR SELECT USING (
        club_id IN (
            SELECT cm.club_id 
            FROM public.club_members cm
            WHERE cm.user_id = auth.uid()
            AND (
                required_role IS NULL 
                OR cm.role = required_role 
                OR cm.role = 'ADMIN'
            )
        )
    );

CREATE POLICY "Enable insert for club admins and instructors" ON public.documents
    FOR INSERT WITH CHECK (
        club_id IN (
            SELECT cm.club_id 
            FROM public.club_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.role IN ('ADMIN', 'INSTRUCTOR')
        )
    );

CREATE POLICY "Enable update for club document owners and admins" ON public.documents
    FOR UPDATE USING (
        (auth.uid() = created_by OR
        EXISTS (
            SELECT 1 
            FROM public.club_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.club_id = documents.club_id
            AND cm.role = 'ADMIN'
        ))
    );

CREATE POLICY "Enable delete for club document owners and admins" ON public.documents
    FOR DELETE USING (
        (auth.uid() = created_by OR
        EXISTS (
            SELECT 1 
            FROM public.club_members cm
            WHERE cm.user_id = auth.uid()
            AND cm.club_id = documents.club_id
            AND cm.role = 'ADMIN'
        ))
    );

-- Ajouter une migration down
COMMENT ON TABLE public.document_categories IS 'Migration: 20240325000002_add_club_filtering';
