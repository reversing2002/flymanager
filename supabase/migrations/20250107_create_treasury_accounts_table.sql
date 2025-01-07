-- Create treasury table
CREATE TABLE IF NOT EXISTS treasury (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    accepts_external_payments BOOLEAN DEFAULT false,
    can_group_sales BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id)
);

-- Add RLS policies
ALTER TABLE treasury ENABLE ROW LEVEL SECURITY;

-- Policy for select
CREATE POLICY "Users can view treasury accounts" ON treasury
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM club_members cm1
            JOIN club_members cm2 ON cm1.club_id = cm2.club_id
            WHERE cm1.user_id = auth.uid()
            AND cm2.club_id = treasury.club_id
        )
    );

-- Policy for insert/update/delete
CREATE POLICY "Admin can manage treasury accounts" ON treasury
    FOR ALL
    USING (
        (
            -- User is an admin
            auth.uid() IN (
                SELECT u.auth_id
                FROM users u
                JOIN user_group_memberships m ON u.id = m.user_id
                JOIN user_groups g ON m.group_id = g.id
                WHERE g.name = 'ADMIN'
            )
            -- And user is in the same club
            AND EXISTS (
                SELECT 1
                FROM club_members cm1
                JOIN club_members cm2 ON cm1.club_id = cm2.club_id
                WHERE cm1.user_id = auth.uid()
                AND cm2.club_id = treasury.club_id
            )
        )
        OR
        -- User is a treasurer
        auth.uid() IN (
            SELECT u.auth_id
            FROM users u
            JOIN user_group_memberships m ON u.id = m.user_id
            JOIN user_groups g ON m.group_id = g.id
            WHERE g.name = 'TREASURER'
            -- And user is in the same club
            AND EXISTS (
                SELECT 1
                FROM club_members cm1
                JOIN club_members cm2 ON cm1.club_id = cm2.club_id
                WHERE cm1.user_id = auth.uid()
                AND cm2.club_id = treasury.club_id
            )
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER set_treasury_updated_at
    BEFORE UPDATE ON treasury
    FOR EACH ROW
    EXECUTE FUNCTION set_current_timestamp_updated_at();

-- Create function to handle treasury account creation
CREATE OR REPLACE FUNCTION handle_new_treasury_account()
RETURNS TRIGGER AS $$
BEGIN
    -- Create corresponding treasury record
    INSERT INTO treasury (account_id, club_id)
    VALUES (NEW.id, NEW.club_id)
    ON CONFLICT (account_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic treasury creation
CREATE TRIGGER create_treasury_for_account
    AFTER INSERT ON accounts
    FOR EACH ROW
    WHEN (NEW.account_type = 'TREASURY')
    EXECUTE FUNCTION handle_new_treasury_account();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_treasury_club_id ON treasury(club_id);
CREATE INDEX IF NOT EXISTS idx_treasury_account_id ON treasury(account_id);
