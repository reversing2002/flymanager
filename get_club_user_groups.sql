CREATE OR REPLACE FUNCTION public.get_club_user_groups(user_id uuid, club_id uuid)
RETURNS text[] AS $$
SELECT array_agg(ug.code)
FROM user_group_memberships ugm
JOIN user_groups ug ON ugm.group_id = ug.id
WHERE ugm.user_id = $1
AND ugm.club_id = $2;
$$ LANGUAGE sql;
