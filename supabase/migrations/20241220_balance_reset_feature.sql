-- Fonction pour calculer le solde en attente (inclure toutes les transactions non validées)
CREATE OR REPLACE FUNCTION calculate_pending_balance_from_date(
    p_user_id uuid,
    p_date timestamp with time zone
)
RETURNS TABLE (
    validated_balance numeric,
    pending_amount numeric,
    total_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_validated_balance numeric;
    v_pending_amount numeric;
    v_reset_date timestamp with time zone;
BEGIN
    -- Récupérer le solde validé
    SELECT calculate_balance_from_date(p_user_id, p_date) INTO v_validated_balance;

    -- Trouver la date de la dernière réinitialisation
    SELECT ae.date
    INTO v_reset_date
    FROM account_entries ae
    JOIN account_entry_types aet ON ae.entry_type_id = aet.id
    WHERE ae.assigned_to_id = p_user_id
    AND ae.date <= p_date
    AND aet.code = 'BALANCE_RESET'
    ORDER BY ae.date DESC, ae.created_at DESC
    LIMIT 1;

    -- Calculer toutes les transactions non validées (sans limite de date)
    SELECT COALESCE(SUM(ae.amount), 0)
    INTO v_pending_amount
    FROM account_entries ae
    JOIN account_entry_types aet ON ae.entry_type_id = aet.id
    LEFT JOIN flights f ON ae.flight_id = f.id
    LEFT JOIN flight_types ft ON f.flight_type_id = ft.id
    LEFT JOIN accounting_categories ac ON ft.accounting_category_id = ac.id
    WHERE ae.assigned_to_id = p_user_id
    AND (v_reset_date IS NULL OR ae.date > v_reset_date)
    AND ae.is_validated = false
    AND aet.code != 'BALANCE_RESET'
    AND (
        (ae.is_club_paid = false OR ae.is_club_paid IS NULL)
        AND (ac.is_club_paid = false OR ac.is_club_paid IS NULL)
    );

    -- Retourner les résultats
    RETURN QUERY SELECT 
        v_validated_balance,
        v_pending_amount,
        v_validated_balance + v_pending_amount;
END;
$$;
