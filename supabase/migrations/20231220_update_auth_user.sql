-- Fonction pour mettre à jour un utilisateur dans auth.users
create or replace function update_auth_user(
  p_email text,
  p_password text,
  p_user_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Mettre à jour le mot de passe et les métadonnées de l'utilisateur
  update auth.users
  set
    encrypted_password = case
      when p_password is not null and p_password != ''
      then crypt(p_password, gen_salt('bf'))
      else encrypted_password
    end,
    raw_user_meta_data = p_user_metadata,
    updated_at = now()
  where email = p_email;

  -- Mettre à jour les identities si nécessaire
  update auth.identities
  set
    identity_data = jsonb_build_object(
      'sub', user_id,
      'email', p_email,
      'login', p_user_metadata->>'login',
      'role', 'authenticated'
    ),
    updated_at = now()
  where provider_id = p_email;
end;
$$;
