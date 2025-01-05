-- Fonction pour mettre à jour l'email d'un utilisateur dans auth.users
create or replace function update_user_email(p_user_id uuid, p_email text)
returns void
security definer
set search_path = public
language plpgsql
as $$
declare
  v_auth_uid uuid;
  v_user_club_id uuid;
  v_is_admin boolean;
begin
  -- Récupérer le club_id de l'utilisateur et vérifier s'il est admin
  select cm.club_id into v_user_club_id
  from users u
  join club_members cm on cm.user_id = u.id
  where u.id = p_user_id;

  select exists (
    select 1 
    from user_group_memberships ugm
    join user_groups ug on ug.id = ugm.group_id
    where ugm.user_id = auth.uid()
    and ug.club_id = v_user_club_id
    and ug.name = 'ADMIN'
  ) into v_is_admin;

  -- Vérifier si l'utilisateur a les permissions nécessaires
  if not (
    v_is_admin or -- est admin du club
    auth.uid() = p_user_id -- ou modifie son propre profil
  ) then
    raise exception 'Unauthorized';
  end if;

  -- Récupérer l'auth_uid correspondant
  select auth_id into v_auth_uid
  from users
  where id = p_user_id;

  if v_auth_uid is null then
    raise exception 'User not found';
  end if;

  -- Mettre à jour l'email dans auth.users
  update auth.users
  set email = p_email,
      updated_at = now()
  where id = v_auth_uid;
end;
$$;
