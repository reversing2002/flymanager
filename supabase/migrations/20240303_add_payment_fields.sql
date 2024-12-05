-- Add payment related fields to discovery_flights table
ALTER TABLE discovery_flights
ADD COLUMN IF NOT EXISTS payment_amount bigint,
ADD COLUMN IF NOT EXISTS payment_status text,
ADD COLUMN IF NOT EXISTS stripe_session_id text;
