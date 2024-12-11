-- Add instructor_fee column to users table
ALTER TABLE users
ADD COLUMN instructor_fee numeric;

-- Add comment to explain the column
COMMENT ON COLUMN users.instructor_fee IS 'Taux horaire de rémunération de l''instructeur';
