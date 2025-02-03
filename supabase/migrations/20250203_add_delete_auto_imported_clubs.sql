-- Fonction pour supprimer tous les clubs auto-importés
CREATE OR REPLACE FUNCTION public.delete_auto_imported_clubs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_club record;
    v_user record;
BEGIN
    -- Parcourir tous les clubs auto-importés
    FOR v_club IN 
        SELECT id 
        FROM public.clubs 
        WHERE auto_imported = true
    LOOP
        -- Récupérer tous les utilisateurs liés à ce club
        FOR v_user IN
            SELECT DISTINCT u.id, u.auth_id, u.email
            FROM public.users u
            JOIN club_members cm ON cm.user_id = u.id
            WHERE cm.club_id = v_club.id
            -- Ne garder que les utilisateurs qui n'appartiennent qu'à ce club
            AND NOT EXISTS (
                SELECT 1 
                FROM club_members cm2 
                WHERE cm2.user_id = u.id 
                AND cm2.club_id != v_club.id
            )
        LOOP
            -- Supprimer les identités de l'utilisateur
            IF v_user.auth_id IS NOT NULL THEN
                DELETE FROM auth.identities WHERE user_id = v_user.auth_id;
                -- Supprimer aussi de auth.users
                DELETE FROM auth.users WHERE id = v_user.auth_id;
            END IF;
            
            -- Supprimer l'utilisateur de public.users
            DELETE FROM public.users WHERE id = v_user.id;
        END LOOP;

        -- Supprimer le club (la suppression en cascade s'occupera des tables liées)
        DELETE FROM public.clubs WHERE id = v_club.id;
    END LOOP;
END;
$$;
