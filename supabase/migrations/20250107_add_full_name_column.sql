-- Add full_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text GENERATED ALWAYS AS (
    TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
) STORED;

-- Create index for faster searching
CREATE INDEX IF NOT EXISTS users_full_name_idx ON users (full_name);

-- Update RLS policies to allow access to full_name
ALTER POLICY "Enable read access for all users" ON "public"."users"
    USING (true);
