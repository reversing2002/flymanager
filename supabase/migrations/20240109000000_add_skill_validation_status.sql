-- First, let's drop the existing skill_validation_status type if it exists
DROP TYPE IF EXISTS skill_validation_status CASCADE;

-- Create enum type for skill validation status
CREATE TYPE skill_validation_status AS ENUM ('vu', 'guidé', 'validé');

-- Create a temporary column for the new status
ALTER TABLE skill_validations 
  ADD COLUMN status_new skill_validation_status;

-- Update the new column based on the old status
UPDATE skill_validations 
SET status_new = 'validé'::skill_validation_status 
WHERE status::text = 'true' OR status = true;

UPDATE skill_validations 
SET status_new = NULL 
WHERE status::text = 'false' OR status = false;

-- Drop the old status column
ALTER TABLE skill_validations 
  DROP COLUMN status;

-- Rename the new column
ALTER TABLE skill_validations 
  RENAME COLUMN status_new TO status;

-- Set the default value and not null constraint
ALTER TABLE skill_validations 
  ALTER COLUMN status SET DEFAULT 'validé'::skill_validation_status;
