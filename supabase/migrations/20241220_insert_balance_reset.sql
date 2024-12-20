-- Récupérer l'ID du type d'entrée BALANCE_RESET
WITH balance_reset_type AS (
    SELECT id 
    FROM account_entry_types 
    WHERE code = 'BALANCE_RESET'
)
INSERT INTO account_entries (
    id,
    user_id,
    assigned_to_id,
    date,
    entry_type_id,
    amount,
    payment_method,
    description,
    is_validated,
    is_club_paid,
    created_at,
    updated_at
)
SELECT 
    uuid_generate_v4(),
    '5c447f65-c7d2-4444-8baf-eebf90ef46c1',  -- user_id
    '5c447f65-c7d2-4444-8baf-eebf90ef46c1',  -- assigned_to_id (même que user_id)
    CURRENT_TIMESTAMP,                         -- date du jour
    balance_reset_type.id,                     -- entry_type_id
    160.94,                                    -- montant
    'ACCOUNT',                                 -- payment_method
    'Réinitialisation du solde',              -- description
    true,                                      -- is_validated
    false,                                     -- is_club_paid
    CURRENT_TIMESTAMP,                         -- created_at
    CURRENT_TIMESTAMP                          -- updated_at
FROM balance_reset_type;
