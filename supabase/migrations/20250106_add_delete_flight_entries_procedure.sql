-- Création de la procédure stockée pour supprimer les entrées comptables d'un vol
CREATE OR REPLACE FUNCTION delete_flight_entries(p_flight_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_is_validated BOOLEAN;
    v_flight_instructor_id UUID;
BEGIN
    -- Récupérer l'ID de l'utilisateur actuel
    v_user_id := auth.uid();
    
    -- Récupérer les informations du vol
    SELECT is_validated, instructor_id 
    INTO v_is_validated, v_flight_instructor_id
    FROM flights 
    WHERE id = p_flight_id;
    
    -- Si le vol n'existe pas
    IF v_is_validated IS NULL THEN
        RAISE EXCEPTION 'Vol non trouvé';
    END IF;

    -- Vérifier les conditions d'autorisation exactement comme dans la policy
    -- 1. Est admin OU
    -- 2. Est le propriétaire du vol et le vol n'est pas validé OU
    -- 3. Est l'instructeur du vol et le vol n'est pas validé
    IF NOT (
        has_any_group(auth.uid(), ARRAY['ADMIN'::text])
        OR
        EXISTS (
            SELECT 1 
            FROM account_entries ae
            WHERE ae.flight_id = p_flight_id 
            AND ae.user_id = v_user_id 
            AND NOT v_is_validated
        )
        OR
        (
            v_flight_instructor_id IS NOT NULL 
            AND v_flight_instructor_id = v_user_id 
            AND NOT v_is_validated
        )
    ) THEN
        RAISE EXCEPTION 'Non autorisé à modifier ce vol';
    END IF;

    -- Si on arrive ici, l'utilisateur est autorisé à supprimer les entrées
    DELETE FROM account_entries
    WHERE flight_id = p_flight_id;
END;
$$;
