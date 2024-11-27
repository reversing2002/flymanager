-- Restaurer la contrainte d'unicité originale
ALTER TABLE public.document_categories 
DROP CONSTRAINT IF EXISTS unique_name_per_parent_club;

ALTER TABLE public.document_categories 
ADD CONSTRAINT unique_name_per_parent 
UNIQUE (name, parent_id);

-- Supprimer les colonnes club_id
ALTER TABLE public.documents 
DROP COLUMN IF EXISTS club_id;

ALTER TABLE public.document_categories 
DROP COLUMN IF EXISTS club_id;
