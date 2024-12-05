-- Add instructor_cost column if it doesn't exist
ALTER TABLE flights
ADD COLUMN IF NOT EXISTS instructor_cost decimal;

-- Add instructor_invoice_id column if it doesn't exist
ALTER TABLE flights
ADD COLUMN IF NOT EXISTS instructor_invoice_id uuid REFERENCES instructor_invoices(id);

-- Add instructor_rate column to users if it doesn't exist
ALTER TABLE users
ADD COLUMN IF NOT EXISTS instructor_rate decimal;

-- Create index for instructor flights
CREATE INDEX IF NOT EXISTS idx_flights_instructor_id ON flights(instructor_id);

-- Create index for instructor invoices
CREATE INDEX IF NOT EXISTS idx_flights_instructor_invoice_id ON flights(instructor_invoice_id);