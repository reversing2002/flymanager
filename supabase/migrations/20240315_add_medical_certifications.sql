-- Create medical_certifications table
CREATE TABLE medical_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  class TEXT NOT NULL CHECK (class IN ('CLASS_1', 'CLASS_2')),
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_medical_certifications_user_id ON medical_certifications(user_id);

-- Add RLS policies
ALTER TABLE medical_certifications ENABLE ROW LEVEL SECURITY;

-- Policy for viewing medical certifications
CREATE POLICY "Users can view medical certifications in their club"
ON medical_certifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM club_members cm1
    JOIN club_members cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = medical_certifications.user_id
  )
);

-- Policy for managing medical certifications
CREATE POLICY "Admins and instructors can manage medical certifications"
ON medical_certifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'INSTRUCTOR')
  )
);

-- Create storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-documents', 'medical-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for medical documents
CREATE POLICY "Medical documents are accessible by club members"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medical-documents' AND
  EXISTS (
    SELECT 1 FROM club_members cm1
    JOIN club_members cm2 ON cm1.club_id = cm2.club_id
    JOIN medical_certifications mc ON cm2.user_id = mc.user_id
    WHERE cm1.user_id = auth.uid()
    AND storage.foldername(name) = 'medical-documents'
  )
);

CREATE POLICY "Users can upload their own medical documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medical-documents' AND
  storage.foldername(name) = 'medical-documents' AND
  (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'INSTRUCTOR')
    )
    OR
    storage.filename(name) LIKE auth.uid() || '%'
  )
);

-- Remove medical fields from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS medical_expiry;