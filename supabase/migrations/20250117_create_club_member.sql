-- Create the create_club_member function
CREATE OR REPLACE FUNCTION create_club_member(
  p_club_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_login text,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_group_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Create user in auth.users
    INSERT INTO auth.users (
      email,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      p_email,
      jsonb_build_object(
        'first_name', p_first_name,
        'last_name', p_last_name,
        'login', p_login
      ),
      now(),
      now()
    )
    RETURNING id INTO v_user_id;

    -- Create user in public.users
    INSERT INTO public.users (
      id,
      email,
      first_name,
      last_name,
      login
    ) VALUES (
      v_user_id,
      p_email,
      p_first_name,
      p_last_name,
      p_login
    );
  END IF;

  -- Create club member relationship if it doesn't exist
  INSERT INTO public.club_members (club_id, user_id)
  VALUES (p_club_id, v_user_id)
  ON CONFLICT (club_id, user_id) DO NOTHING;

  -- Get group ID for the role
  SELECT id INTO v_group_id
  FROM public.user_groups
  WHERE club_id = p_club_id AND code = p_role;

  IF v_group_id IS NOT NULL THEN
    -- Add user to group if not already a member
    INSERT INTO public.user_group_memberships (user_id, group_id)
    VALUES (v_user_id, v_group_id)
    ON CONFLICT (user_id, group_id) DO NOTHING;
  END IF;

  RETURN v_user_id;
END;
$$;
