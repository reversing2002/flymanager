-- Fonction pour récupérer le schéma des tables
CREATE OR REPLACE FUNCTION public.get_tables_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    WITH table_info AS (
        SELECT 
            t.table_name,
            t.table_schema,
            obj_description(pgc.oid, 'pg_class') as table_description,
            pgc.oid as table_oid
        FROM information_schema.tables t
        JOIN pg_class pgc ON pgc.relname = t.table_name
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
    ),
    column_info AS (
        SELECT 
            c.table_name,
            jsonb_agg(
                jsonb_build_object(
                    'column_name', c.column_name,
                    'data_type', c.data_type,
                    'is_nullable', c.is_nullable,
                    'column_default', c.column_default,
                    'description', col_description(ti.table_oid, c.ordinal_position)
                ) ORDER BY c.ordinal_position
            ) as columns
        FROM information_schema.columns c
        JOIN table_info ti ON ti.table_name = c.table_name
        WHERE c.table_schema = 'public'
        GROUP BY c.table_name
    ),
    constraint_info AS (
        SELECT 
            tc.table_name,
            jsonb_agg(
                jsonb_build_object(
                    'constraint_name', tc.constraint_name,
                    'constraint_type', tc.constraint_type,
                    'definition', pg_get_constraintdef(pgc.oid)
                ) ORDER BY tc.constraint_name
            ) as constraints
        FROM information_schema.table_constraints tc
        JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY', 'CHECK')
        GROUP BY tc.table_name
    ),
    index_info AS (
        SELECT 
            tablename as table_name,
            jsonb_agg(
                jsonb_build_object(
                    'index_name', indexname,
                    'definition', indexdef,
                    'is_unique', (
                        SELECT i.indisunique
                        FROM pg_index i
                        JOIN pg_class c ON c.oid = i.indexrelid
                        WHERE c.relname = indexname
                    ),
                    'is_primary', (
                        SELECT i.indisprimary
                        FROM pg_index i
                        JOIN pg_class c ON c.oid = i.indexrelid
                        WHERE c.relname = indexname
                    ),
                    'columns', (
                        SELECT jsonb_agg(a.attname ORDER BY array_position(i.indkey, a.attnum))
                        FROM pg_index i
                        JOIN pg_class c ON c.oid = i.indexrelid
                        JOIN pg_class t ON t.oid = i.indrelid
                        JOIN pg_attribute a ON a.attrelid = t.oid
                        WHERE c.relname = indexname
                        AND a.attnum = ANY(i.indkey)
                    )
                ) ORDER BY indexname
            ) as indexes
        FROM pg_indexes
        WHERE schemaname = 'public'
        GROUP BY tablename
    ),
    triggers_info AS (
        SELECT 
            event_object_table as table_name,
            jsonb_agg(
                jsonb_build_object(
                    'trigger_name', trigger_name,
                    'event_manipulation', event_manipulation,
                    'action_timing', action_timing,
                    'action_statement', action_statement
                ) ORDER BY trigger_name
            ) as triggers
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        GROUP BY event_object_table
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'table_name', ti.table_name,
            'description', ti.table_description,
            'columns', COALESCE(ci.columns, '[]'::jsonb),
            'constraints', COALESCE(coi.constraints, '[]'::jsonb),
            'indexes', COALESCE(ii.indexes, '[]'::jsonb),
            'triggers', COALESCE(tri.triggers, '[]'::jsonb),
            'create_statement', pg_get_tabledef(ti.table_name::regclass)
        ) ORDER BY ti.table_name
    )
    INTO result
    FROM table_info ti
    LEFT JOIN column_info ci ON ci.table_name = ti.table_name
    LEFT JOIN constraint_info coi ON coi.table_name = ti.table_name
    LEFT JOIN index_info ii ON ii.table_name = ti.table_name
    LEFT JOIN triggers_info tri ON tri.table_name = ti.table_name;

    RETURN result;
END;
$$;

-- Fonction utilitaire pour obtenir la définition complète d'une table
CREATE OR REPLACE FUNCTION public.pg_get_tabledef(p_table regclass)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_table_ddl   text;
    column_record record;
    v_table_name  text := p_table::text;
BEGIN
    -- Commencer avec la commande CREATE TABLE
    SELECT 'CREATE TABLE ' || v_table_name || ' (' INTO v_table_ddl;

    -- Ajouter les colonnes
    FOR column_record IN 
        SELECT 
            column_name, 
            data_type,
            COALESCE(character_maximum_length::text, '') as max_length,
            CASE 
                WHEN is_nullable = 'NO' THEN ' NOT NULL'
                ELSE ''
            END as nullable,
            COALESCE(' DEFAULT ' || column_default, '') as default_value
        FROM information_schema.columns
        WHERE table_name = v_table_name::text
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        v_table_ddl := v_table_ddl || E'\n    ' || column_record.column_name || ' ' ||
            column_record.data_type || 
            CASE 
                WHEN column_record.max_length > '' 
                AND column_record.data_type NOT LIKE '%[]'
                THEN '(' || column_record.max_length || ')'
                ELSE ''
            END || 
            column_record.nullable ||
            column_record.default_value || ',';
    END LOOP;

    -- Retirer la dernière virgule
    v_table_ddl := substring(v_table_ddl, 1, length(v_table_ddl) - 1);

    -- Fermer la parenthèse
    v_table_ddl := v_table_ddl || E'\n);';

    RETURN v_table_ddl;
END;
$$;

-- Fonction pour récupérer les policies
CREATE OR REPLACE FUNCTION public.get_policies_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'table_name', tablename,
                'policies', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'policy_name', policyname,
                            'roles', roles,
                            'cmd', cmd,
                            'qual', qual,
                            'with_check', with_check
                        )
                    )
                    FROM pg_policies
                    WHERE schemaname = 'public'
                    AND tablename = p.tablename
                )
            )
        )
        FROM (
            SELECT DISTINCT tablename
            FROM pg_policies
            WHERE schemaname = 'public'
        ) p
    );
END;
$$;

-- Fonction pour récupérer les fonctions
CREATE OR REPLACE FUNCTION public.get_functions_schema()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    WITH function_info AS (
        SELECT 
            p.proname as function_name,
            t.typname as return_type,
            CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type,
            CASE p.provolatile
                WHEN 'i' THEN 'IMMUTABLE'
                WHEN 's' THEN 'STABLE'
                WHEN 'v' THEN 'VOLATILE'
            END as volatility,
            pg_get_functiondef(p.oid) as function_definition,
            obj_description(p.oid, 'pg_proc') as description,
            p.proargtypes,
            p.oid
        FROM pg_proc p
        JOIN pg_type t ON t.oid = p.prorettype
        WHERE p.pronamespace = 'public'::regnamespace
        AND p.prokind = 'f'
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'function_name', fi.function_name,
            'return_type', fi.return_type,
            'argument_types', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'position', a.ord,
                        'type', t2.typname
                    ) ORDER BY a.ord
                )
                FROM unnest(fi.proargtypes) WITH ORDINALITY AS a(oid, ord)
                JOIN pg_type t2 ON t2.oid = a.oid
            ),
            'security_type', fi.security_type,
            'volatility', fi.volatility,
            'function_definition', fi.function_definition,
            'description', fi.description
        ) ORDER BY fi.function_name
    )
    INTO result
    FROM function_info fi;

    RETURN result;
END;
$$;

-- Fonction pour obtenir les statistiques des clubs
CREATE OR REPLACE FUNCTION public.get_clubs_stats()
RETURNS TABLE (
    id uuid,
    name text,
    code text,
    member_count bigint,
    aircraft_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.code,
        COUNT(DISTINCT cm.user_id) as member_count,
        COUNT(DISTINCT a.id) as aircraft_count
    FROM clubs c
    LEFT JOIN club_members cm ON cm.club_id = c.id
    LEFT JOIN aircraft a ON a.club_id = c.id
    GROUP BY c.id, c.name, c.code
    ORDER BY c.name;
END;
$$;

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION public.get_tables_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_policies_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_functions_schema() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_clubs_stats() TO authenticated;
