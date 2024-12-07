-- Supprimer la fonction add_club_member qui utilise la colonne role
DROP FUNCTION IF EXISTS add_club_member(uuid, uuid, text);

-- Créer la nouvelle version de la fonction sans le paramètre role
CREATE OR REPLACE FUNCTION add_club_member(p_club_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO club_members (club_id, user_id)
    VALUES (p_club_id, p_user_id)
    ON CONFLICT (club_id, user_id) 
    DO UPDATE SET 
        updated_at = now();
END;
$$;

-- Supprimer la colonne role
ALTER TABLE club_members DROP COLUMN role;
