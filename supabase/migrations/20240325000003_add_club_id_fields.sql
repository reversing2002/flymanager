-- Ajouter club_id aux catégories de documents
ALTER TABLE public.document_categories 
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Ajouter club_id aux documents
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Mettre à jour les contraintes d'unicité pour inclure le club_id
ALTER TABLE public.document_categories 
DROP CONSTRAINT IF EXISTS unique_name_per_parent;

ALTER TABLE public.document_categories 
ADD CONSTRAINT unique_name_per_parent_club 
UNIQUE (name, parent_id, club_id);
