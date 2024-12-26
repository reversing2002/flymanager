-- Create passenger_info table
CREATE TABLE public.passenger_info (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    flight_id uuid REFERENCES discovery_flights(id) ON DELETE CASCADE,
    passenger_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);



-- Add indexes
CREATE INDEX idx_passenger_info_flight_id ON public.passenger_info(flight_id);

-- Enable RLS
ALTER TABLE public.passenger_info ENABLE ROW LEVEL SECURITY;
