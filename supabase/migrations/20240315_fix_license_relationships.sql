-- Add foreign key constraint to pilot_licenses
ALTER TABLE pilot_licenses
DROP CONSTRAINT IF EXISTS pilot_licenses_user_id_fkey,
ADD CONSTRAINT pilot_licenses_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES users(id)
ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_pilot_licenses_user_id 
ON pilot_licenses(user_id);