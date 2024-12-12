-- Create medical types table
CREATE TABLE medical_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  system_type BOOLEAN DEFAULT FALSE,
  validity_period INTEGER, -- in months, NULL for no expiration
  requires_end_date BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for medical_types
ALTER TABLE medical_types ENABLE ROW LEVEL SECURITY;

-- Enable read access for all authenticated users
CREATE POLICY "medical_types_read_policy" ON medical_types
    FOR SELECT
    TO authenticated
    USING (true);

-- Enable write access for admins
CREATE POLICY "medical_types_write_policy" ON medical_types
    FOR ALL
    TO authenticated
    USING (has_any_group(auth.uid(), ARRAY['ADMIN'::text]));

-- Create medicals table
CREATE TABLE medicals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  medical_type_id UUID REFERENCES medical_types(id) ON DELETE CASCADE,
  obtained_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  scan_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for medicals
ALTER TABLE medicals ENABLE ROW LEVEL SECURITY;

-- Enable read access for medicals
CREATE POLICY "medicals_read_policy" ON medicals
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM club_members viewer
            WHERE viewer.user_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM club_members target
                WHERE target.club_id = viewer.club_id
                AND target.user_id = medicals.user_id
            )
        )
    );

-- Enable write access for own medicals and admins
CREATE POLICY "medicals_write_policy" ON medicals
    FOR ALL
    TO authenticated
    USING (
        user_id = auth.uid() OR
        has_any_group(auth.uid(), ARRAY['ADMIN'::text])
    );

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_medical_types_updated_at
  BEFORE UPDATE ON medical_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medicals_updated_at
  BEFORE UPDATE ON medicals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default medical types
INSERT INTO medical_types (name, description, system_type, validity_period, requires_end_date)
VALUES 
  ('Classe 1', 'Certificat médical classe 1', true, 12, TRUE),
  ('Classe 2', 'Certificat médical classe 2', true, 24, TRUE);
