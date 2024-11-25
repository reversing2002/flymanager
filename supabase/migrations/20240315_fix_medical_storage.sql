-- Fix medical certification class constraint
ALTER TABLE medical_certifications DROP CONSTRAINT IF EXISTS medical_certifications_class_check;
ALTER TABLE medical_certifications ADD CONSTRAINT medical_certifications_class_check 
CHECK (class IN ('CLASS_1', 'CLASS_2'));

-- Create medical documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create licenses storage bucket if it doesn't exist  
INSERT INTO storage.buckets (id, name, public)
VALUES ('licenses', 'licenses', true)
ON CONFLICT (id) DO NOTHING;

-- Create folders in buckets
DO $$
BEGIN
  -- Create medical-documents folder
  INSERT INTO storage.objects (bucket_id, name, owner, created_at, updated_at, metadata)
  VALUES ('medical-documents', 'medical-documents/', auth.uid(), now(), now(), '{"mimetype": "application/x-directory"}')
  ON CONFLICT DO NOTHING;

  -- Create license-documents folder
  INSERT INTO storage.objects (bucket_id, name, owner, created_at, updated_at, metadata) 
  VALUES ('licenses', 'license-documents/', auth.uid(), now(), now(), '{"mimetype": "application/x-directory"}')
  ON CONFLICT DO NOTHING;
END $$;