-- Create suppliers table linked to accounts
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    siret VARCHAR(14),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add account_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_account_id ON suppliers(account_id);
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);

-- Add RLS policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers
CREATE POLICY "Users can view suppliers from their club" ON suppliers
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM club_members cm
        JOIN accounts a ON a.club_id = cm.club_id
        WHERE cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'
        AND a.id = suppliers.account_id
    ));

CREATE POLICY "Users can insert suppliers for their club" ON suppliers
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM club_members cm
        JOIN accounts a ON a.club_id = cm.club_id
        WHERE cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'
        AND a.id = suppliers.account_id
    ));

CREATE POLICY "Users can update suppliers from their club" ON suppliers
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM club_members cm
        JOIN accounts a ON a.club_id = cm.club_id
        WHERE cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'
        AND a.id = suppliers.account_id
    ));

CREATE POLICY "Users can delete suppliers from their club" ON suppliers
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM club_members cm
        JOIN accounts a ON a.club_id = cm.club_id
        WHERE cm.user_id = auth.uid()
        AND cm.status = 'ACTIVE'
        AND a.id = suppliers.account_id
    ));

-- Create trigger for suppliers
CREATE TRIGGER suppliers_audit
    AFTER INSERT OR UPDATE OR DELETE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION process_audit_trigger();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
