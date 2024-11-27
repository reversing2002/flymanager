-- Revert club_id NOT NULL for document_categories
ALTER TABLE public.document_categories 
ALTER COLUMN club_id DROP NOT NULL;
