-- Modification du trigger de vérification des montants pour les account_entries
CREATE OR REPLACE FUNCTION check_account_entry_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Vérifier que le montant correspond au type (crédit/débit)
    -- Exception pour le type de réinitialisation du solde (d04dc1cb-28e8-44ed-862a-9fff6e9e81ca)
    IF NEW.entry_type_id != 'd04dc1cb-28e8-44ed-862a-9fff6e9e81ca' AND EXISTS (
        SELECT 1 
        FROM account_entry_types 
        WHERE id = NEW.entry_type_id 
        AND (
            (is_credit = true AND NEW.amount < 0) OR
            (is_credit = false AND NEW.amount > 0)
        )
    ) THEN
        RAISE EXCEPTION 'Le montant ne correspond pas au type d''opération (crédit/débit)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS check_account_entry_amount ON account_entries;

-- Create the trigger
CREATE TRIGGER check_account_entry_amount
    BEFORE INSERT OR UPDATE ON account_entries
    FOR EACH ROW
    EXECUTE FUNCTION check_account_entry_amount();
