-- Add instructor_fee column to flights table
ALTER TABLE flights
ADD COLUMN instructor_fee numeric;

-- Add comment to explain the column
COMMENT ON COLUMN flights.instructor_fee IS 'Montant à reverser à l''instructeur pour ce vol';
