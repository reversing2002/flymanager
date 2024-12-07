-- Mettre à jour la fonction create_auth_user pour utiliser l'ID de public.users
CREATE OR REPLACE FUNCTION public.create_auth_user(
  p_email text,
  p_password text,
  p_role text,
  p_login text,
  p_user_id uuid  -- Ajout du paramètre pour l'ID
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_existing_user RECORD;
  v_instance_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Récupérer l'utilisateur existant
  SELECT id, email INTO v_existing_user
  FROM public.users
  WHERE id = p_user_id;

  -- Insérer dans auth.users avec l'ID fourni
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    aud,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous,
    raw_user_meta_data,
    raw_app_meta_data
  )
  VALUES (
    p_user_id,  -- Utiliser l'ID fourni au lieu d'en générer un nouveau
    v_instance_id,
    v_existing_user.email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    false,
    false,
    jsonb_build_object(
      'login', p_login,
      'role', p_role
    ),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    )
  );

  -- Mettre à jour public.users avec l'auth_id
  UPDATE public.users
  SET auth_id = p_user_id  -- Utiliser le même ID
  WHERE id = v_existing_user.id;

  RETURN p_user_id;
END;
$function$;
