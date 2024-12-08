-- Create the function to create a club with its admin
CREATE OR REPLACE FUNCTION public.create_club_with_admin(
  p_club_name text,
  p_club_code text,
  p_admin_email text,
  p_admin_password text,
  p_admin_login text,
  p_admin_first_name text,
  p_admin_last_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_club_id uuid;
  v_user_id uuid;
  v_existing_user_id uuid;
BEGIN
  -- Check if email already exists
  SELECT id INTO v_existing_user_id
  FROM public.users
  WHERE email = p_admin_email;

  IF v_existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Un utilisateur avec cet email existe déjà';
  END IF;

  -- Validate club code format
  IF NOT p_club_code ~ '^[A-Za-z0-9]{3,10}$' THEN
    RAISE EXCEPTION 'Le code de l''aérodrome doit contenir entre 3 et 10 caractères alphanumériques';
  END IF;

  -- Create the club
  INSERT INTO public.clubs (name, code)
  VALUES (p_club_name, upper(p_club_code))
  RETURNING id INTO v_club_id;

  -- 1. Create user in public.users
  INSERT INTO public.users (
    first_name,
    last_name,
    email,
    login,
    created_at,
    updated_at
  )
  VALUES (
    p_admin_first_name,
    p_admin_last_name,
    p_admin_email,
    p_admin_login,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- 2. Create auth user
  PERFORM create_auth_user(
    p_email := p_admin_email,
    p_password := p_admin_password,
    p_role := 'ADMIN',
    p_login := p_admin_login,
    p_user_id := v_user_id
  );

  -- 3. Update user groups to add admin role
  PERFORM update_user_groups(
    p_user_id := v_user_id,
    p_groups := ARRAY['ADMIN']::text[]
  );

  -- 4. Add admin as club member
  INSERT INTO club_members (
    user_id,
    club_id,
    joined_at
  )
  VALUES (
    v_user_id,
    v_club_id,
    NOW()
  );

  RETURN v_club_id;

EXCEPTION WHEN OTHERS THEN
  -- If any error occurs, clean up by deleting the club if it was created
  IF v_club_id IS NOT NULL THEN
    DELETE FROM public.clubs WHERE id = v_club_id;
  END IF;
  -- And the user if it was created
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
  RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_club_with_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_club_with_admin TO anon;

-- Create policy to allow creating clubs through the function
DROP POLICY IF EXISTS create_club_policy ON public.clubs;
CREATE POLICY create_club_policy ON public.clubs
    FOR INSERT
    TO public
    WITH CHECK (true);
