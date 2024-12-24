-- Create or replace the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.set_account_entry_club_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le club_id n'est pas déjà défini
    IF NEW.club_id IS NULL THEN
        -- Récupérer le club_id de l'utilisateur à partir de la table club_members
        SELECT club_id INTO NEW.club_id
        FROM public.club_members
        WHERE user_id = NEW.user_id
        AND status = 'ACTIVE'
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS set_club_id_on_account_entry ON public.account_entries;
CREATE TRIGGER set_club_id_on_account_entry
    BEFORE INSERT ON public.account_entries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_account_entry_club_id();

-- Mettre à jour les entrées existantes qui n'ont pas de club_id
UPDATE public.account_entries ae
SET club_id = cm.club_id
FROM public.club_members cm
WHERE ae.user_id = cm.user_id
AND cm.status = 'ACTIVE'
AND ae.club_id IS NULL;
