-- Create the create_member function
CREATE OR REPLACE FUNCTION create_member(
  p_club_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_login text,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_existing_user_id uuid;
BEGIN
  -- Check if email already exists
  SELECT id INTO v_existing_user_id
  FROM public.users
  WHERE email = p_email;

  IF v_existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Un utilisateur avec cet email existe déjà';
  END IF;

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
    p_first_name,
    p_last_name,
    p_email,
    p_login,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- 2. Create auth user with temporary password
  PERFORM create_auth_user(
    p_email := p_email,
    p_password := 'ChangeMe123!',
    p_role := p_role,
    p_login := p_login,
    p_user_id := v_user_id,
    p_user_metadata := jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'login', p_login
    )
  );

  -- 3. Add user as club member
  INSERT INTO club_members (
    user_id,
    club_id,
    joined_at
  )
  VALUES (
    v_user_id,
    p_club_id,
    NOW()
  );

  -- 4. Update user groups based on role
  PERFORM update_user_groups(
    p_user_id := v_user_id,
    p_groups := ARRAY[p_role]::text[]
  );

  RETURN v_user_id;

EXCEPTION WHEN OTHERS THEN
  -- If any error occurs, clean up by deleting the user if it was created
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = v_user_id;
  END IF;
  RAISE;
END;
$$;
