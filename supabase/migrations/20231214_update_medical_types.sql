-- Add requires_end_date to medical_types
ALTER TABLE medical_types ADD COLUMN requires_end_date BOOLEAN DEFAULT TRUE;

-- Update existing records
UPDATE medical_types SET requires_end_date = TRUE WHERE requires_end_date IS NULL;
