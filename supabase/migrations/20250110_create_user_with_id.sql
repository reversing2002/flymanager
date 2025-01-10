-- Création de la fonction create_user_with_id
CREATE OR REPLACE FUNCTION public.create_user_with_id(
  p_id uuid,
  p_email text,
  p_login text,
  p_first_name text,
  p_last_name text,
  p_phone text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Désactiver temporairement le trigger de génération d'UUID
  ALTER TABLE public.users DISABLE TRIGGER users_id_trigger;
  
  -- Insérer l'utilisateur avec l'ID spécifié
  INSERT INTO public.users (
    id,
    auth_id,
    email,
    login,
    first_name,
    last_name,
    phone
  ) VALUES (
    p_id,
    p_id,
    p_email,
    p_login,
    p_first_name,
    p_last_name,
    p_phone
  );
  
  -- Réactiver le trigger
  ALTER TABLE public.users ENABLE TRIGGER users_id_trigger;
  
  -- Vérifier que l'insertion a réussi
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_id) THEN
    RAISE EXCEPTION 'Erreur lors de la création de l''utilisateur';
  END IF;
END;
$$;
