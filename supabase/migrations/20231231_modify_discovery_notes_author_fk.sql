-- Supprimer d'abord la contrainte de clé étrangère existante
ALTER TABLE public.discovery_notes
DROP CONSTRAINT IF EXISTS discovery_notes_author_id_fkey;

-- Ajouter la nouvelle contrainte de clé étrangère vers public.users
ALTER TABLE public.discovery_notes
ADD CONSTRAINT discovery_notes_author_id_fkey
FOREIGN KEY (author_id)
REFERENCES public.users(id);
