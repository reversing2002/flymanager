-- Fonction pour récupérer les groupes d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_groups(user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN ARRAY(
        SELECT ug.name
        FROM user_groups ug
        JOIN user_group_memberships ugm ON ug.id = ugm.group_id
        WHERE ugm.user_id = user_id
    );
END;
$$;

-- Fonction pour mettre à jour les groupes d'un utilisateur
CREATE OR REPLACE FUNCTION update_user_groups(p_user_id uuid, p_groups text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Supprimer les anciennes appartenances aux groupes
    DELETE FROM user_group_memberships
    WHERE user_id = p_user_id;
    
    -- Insérer les nouvelles appartenances aux groupes
    INSERT INTO user_group_memberships (user_id, group_id)
    SELECT 
        p_user_id,
        ug.id
    FROM unnest(p_groups) AS group_name
    JOIN user_groups ug ON UPPER(ug.name) = UPPER(group_name);
END;
$$;
