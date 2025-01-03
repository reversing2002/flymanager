-- Create ffplum_credentials table
CREATE TABLE IF NOT EXISTS ffplum_credentials (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    ffplum_login VARCHAR(255) NULL,
    ffplum_password VARCHAR(255) NULL,
    last_sync_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', NOW()),
    CONSTRAINT ffplum_credentials_pkey PRIMARY KEY (id),
    CONSTRAINT unique_user_credentials UNIQUE (user_id),
    CONSTRAINT ffplum_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE ffplum_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own ffplum credentials" ON ffplum_credentials
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ffplum credentials" ON ffplum_credentials
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ffplum credentials" ON ffplum_credentials
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ffplum credentials" ON ffplum_credentials
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_ffplum_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER update_ffplum_credentials_updated_at
    BEFORE UPDATE ON ffplum_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_ffplum_credentials_updated_at();

CREATE INDEX IF NOT EXISTS idx_ffplum_credentials_user_id ON ffplum_credentials USING BTREE (user_id);
