-- Add auto_imported and import_date fields to clubs table
ALTER TABLE public.clubs 
ADD COLUMN auto_imported boolean DEFAULT false,
ADD COLUMN import_date timestamp with time zone;
