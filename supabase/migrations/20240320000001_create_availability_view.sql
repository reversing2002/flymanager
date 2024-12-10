-- Create a view to expose auth.users to PostgREST
CREATE OR REPLACE VIEW public.users AS
SELECT 
    id,
    email,
    raw_user_meta_data->>'first_name' as first_name,
    raw_user_meta_data->>'last_name' as last_name
FROM auth.users;

-- Grant appropriate permissions
GRANT SELECT ON public.users TO anon, authenticated;

-- Create a foreign key to make the relationship visible to PostgREST
COMMENT ON COLUMN availabilities.user_id IS E'@foreignKey (id) references public.users';
