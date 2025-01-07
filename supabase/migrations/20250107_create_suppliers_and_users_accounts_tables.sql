-- Create suppliers table linked to accounts
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    siret VARCHAR(14),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users_accounts table to link users (pilots) to accounts
CREATE TABLE IF NOT EXISTS users_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, account_id)
);

-- Add indexes
CREATE INDEX idx_suppliers_account_id ON suppliers(account_id);
CREATE INDEX idx_users_accounts_user_id ON users_accounts(user_id);
CREATE INDEX idx_users_accounts_account_id ON users_accounts(account_id);

-- Add RLS policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers
CREATE POLICY "Users can view suppliers from their club" ON suppliers
    FOR SELECT
    USING (account_id IN (
        SELECT id FROM accounts WHERE club_id IN (
            SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert suppliers for their club" ON suppliers
    FOR INSERT
    WITH CHECK (account_id IN (
        SELECT id FROM accounts WHERE club_id IN (
            SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can update suppliers from their club" ON suppliers
    FOR UPDATE
    USING (account_id IN (
        SELECT id FROM accounts WHERE club_id IN (
            SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
        )
    ));

-- Create policies for users_accounts
CREATE POLICY "Users can view their own account links" ON users_accounts
    FOR SELECT
    USING (
        user_id = auth.uid() OR
        account_id IN (
            SELECT id FROM accounts WHERE club_id IN (
                SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can link accounts from their club" ON users_accounts
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() OR
        account_id IN (
            SELECT id FROM accounts WHERE club_id IN (
                SELECT club_id FROM user_clubs WHERE user_id = auth.uid()
            )
        )
    );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for suppliers
CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
