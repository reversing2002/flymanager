-- Création de la procédure stockée pour supprimer un vol et ses entrées comptables
CREATE OR REPLACE FUNCTION delete_flight_with_entries(p_flight_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Supprimer d'abord toutes les entrées comptables liées au vol
    DELETE FROM account_entries ae
    WHERE ae.flight_id = p_flight_id;

    -- Ensuite, supprimer le vol lui-même
    DELETE FROM flights f
    WHERE f.id = p_flight_id;

    -- Si le vol n'existe pas, lever une exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vol non trouvé avec l''ID: %', p_flight_id;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la suppression du vol et de ses entrées: %', SQLERRM;
END;
$$;
