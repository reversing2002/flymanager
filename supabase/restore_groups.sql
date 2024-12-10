-- Recréation de la table user_groups
CREATE TABLE IF NOT EXISTS public.user_groups (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_groups_pkey PRIMARY KEY (id)
);

-- Insertion des groupes de base
INSERT INTO public.user_groups (id, name, description) VALUES
    ('11111111-1111-1111-1111-111111111111', 'ADMIN', 'Administrateurs du système avec accès complet'),
    ('22222222-2222-2222-2222-222222222222', 'INSTRUCTOR', 'Instructeurs de vol habilités à donner des cours'),
    ('33333333-3333-3333-3333-333333333333', 'PILOT', 'Pilotes certifiés'),
    ('44444444-4444-4444-4444-444444444444', 'MECHANIC', 'Mécaniciens responsables de la maintenance'),
    ('55555555-5555-5555-5555-555555555555', 'STUDENT', 'Élèves pilotes en formation');

-- Ajout d'un index sur le nom pour optimiser les recherches
CREATE INDEX IF NOT EXISTS user_groups_name_idx ON public.user_groups (name);

-- Création de la table user_group_memberships
CREATE TABLE IF NOT EXISTS public.user_group_memberships (
    user_id uuid NOT NULL,
    group_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_group_memberships_pkey PRIMARY KEY (user_id, group_id),
    CONSTRAINT user_group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES user_groups (id) ON DELETE CASCADE,
    CONSTRAINT user_group_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Association des utilisateurs avec leurs groupes
INSERT INTO public.user_group_memberships (user_id, group_id) VALUES
    -- Administrateurs
    ('aaaaaaaa-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111'), -- Admin System
    ('dddddddd-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'), -- Pascal Descombe (Admin St Chamond)

    -- Instructeurs
    ('aaaaaaaa-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'), -- Marie Martin (Paris)
    ('bbbbbbbb-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'), -- Sophie Laurent (Lyon)
    ('cccccccc-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'), -- Emma Petit (Bordeaux)
    ('dddddddd-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222'), -- Nicolas Becuwe (St Chamond)

    -- Pilotes
    ('aaaaaaaa-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'), -- Jean Dupont (Paris)
    ('bbbbbbbb-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'), -- Lucas Bernard (Lyon)
    ('cccccccc-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'), -- Thomas Roux (Bordeaux)
    ('dddddddd-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'), -- Eddy Fayet (St Chamond)

    -- Mécaniciens
    ('aaaaaaaa-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'), -- Pierre Dubois (Paris)
    ('dddddddd-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444'), -- André Jacoud (St Chamond)

    -- Étudiants
    ('aaaaaaaa-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555'), -- Jean Dupont (Paris)
    ('bbbbbbbb-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555'), -- Marie Durand (Lyon)
    ('cccccccc-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555'), -- Paul Martin (Bordeaux)
    ('dddddddd-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555'); -- Léa Bernard (St Chamond)
