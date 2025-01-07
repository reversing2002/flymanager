-- Ajout de la colonne default_expense_account_id à la table accounts
ALTER TABLE accounts
ADD COLUMN default_expense_account_id UUID REFERENCES accounts(id);

-- Ajout d'une contrainte pour s'assurer que seuls les comptes de type SUPPLIER peuvent avoir un compte de charges par défaut
ALTER TABLE accounts
ADD CONSTRAINT check_default_expense_account
CHECK (
    (type != 'SUPPLIER' AND default_expense_account_id IS NULL) OR
    (type = 'SUPPLIER')
);

-- Création d'une fonction pour valider le type de compte par défaut
CREATE OR REPLACE FUNCTION validate_default_expense_account()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.default_expense_account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM accounts
            WHERE id = NEW.default_expense_account_id
            AND type = 'EXPENSE'
        ) THEN
            RAISE EXCEPTION 'Le compte par défaut doit être un compte de charges';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création du trigger pour valider le type de compte par défaut
CREATE TRIGGER check_default_expense_account_type
    BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION validate_default_expense_account();

-- Ajout d'un index pour améliorer les performances des requêtes
CREATE INDEX idx_accounts_default_expense_account ON accounts(default_expense_account_id)
WHERE default_expense_account_id IS NOT NULL;

-- Fonction de rollback
CREATE OR REPLACE FUNCTION revert_default_expense_account_changes()
RETURNS void AS $$
BEGIN
    DROP TRIGGER IF EXISTS check_default_expense_account_type ON accounts;
    DROP FUNCTION IF EXISTS validate_default_expense_account();
    DROP INDEX IF EXISTS idx_accounts_default_expense_account;
    ALTER TABLE accounts DROP CONSTRAINT IF EXISTS check_default_expense_account;
    ALTER TABLE accounts DROP COLUMN IF EXISTS default_expense_account_id;
END;
$$ LANGUAGE plpgsql;
