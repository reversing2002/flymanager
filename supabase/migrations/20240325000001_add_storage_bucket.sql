-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800, -- 50MB in bytes
    ARRAY[
        'application/pdf',                     -- PDF
        'application/msword',                  -- DOC
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- DOCX
        'image/jpeg',                         -- JPEG, JPG
        'image/png',                          -- PNG
        'image/gif',                          -- GIF
        'video/mp4',                          -- MP4
        'video/quicktime',                    -- MOV
        'application/vnd.ms-excel',           -- XLS
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- XLSX
        'application/vnd.ms-powerpoint',      -- PPT
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' -- PPTX
    ]
);

-- Add storage policies
CREATE POLICY "Enable read access for authenticated users"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Enable insert access for instructors and admins"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
);

CREATE POLICY "Enable update access for instructors and admins"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'documents' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
);

CREATE POLICY "Enable delete access for instructors and admins"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'documents' AND
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('ADMIN', 'INSTRUCTOR')
);
