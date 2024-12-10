-- Création du type enum s'il n'existe pas déjà


-- Nettoyage des tables
TRUNCATE TABLE 
    daily_challenges, user_progress, training_questions, training_modules,
    account_entries, flights, reservations, flight_types, maintenance,
    aircraft, pilot_licenses, club_members, clubs, users, club_events,
    event_participants, announcements, chat_rooms, chat_messages
CASCADE;

-- Nettoyage des utilisateurs dans auth.users
DELETE FROM auth.users WHERE email LIKE '%@4fly.fr';

INSERT INTO flight_types (id, name, description, requires_instructor, accounting_category) VALUES
    ('77777777-0000-0000-0000-000000000000', 'Vol Local', 'Vol local sans instruction', false, 'REGULAR'),
    ('77777777-1111-1111-1111-111111111111', 'Instruction', 'Vol d''instruction avec instructeur', true, 'INSTRUCTION'),
    ('77777777-2222-2222-2222-222222222222', 'Navigation', 'Vol de navigation', false, 'REGULAR'),
    ('77777777-3333-3333-3333-333333333333', 'Vol Découverte', 'Vol découverte pour le public', true, 'DISCOVERY'),
    ('77777777-4444-4444-4444-444444444444', 'Vol BIA', 'Vol pour Brevet d''Initiation Aéronautique', true, 'BIA'),
    ('77777777-5555-5555-5555-555555555555', 'Vol de convoyage', 'Vol de transfert d''aéronef', false, 'FERRY');

-- Création des clubs
INSERT INTO clubs (id, name, code, email, phone, address) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Aéroclub de Paris', 'ACP', 'contact@ac-paris.fr', '0123456789', '123 rue de l''Aviation, 75001 Paris'),
    ('22222222-2222-2222-2222-222222222222', 'Aéroclub de Lyon', 'ACL', 'contact@ac-lyon.fr', '0987654321', '456 avenue des Pilotes, 69001 Lyon'),
    ('33333333-3333-3333-3333-333333333333', 'Aéroclub de Bordeaux', 'ACB', 'contact@ac-bordeaux.fr', '0567891234', '789 boulevard du Ciel, 33000 Bordeaux');


-- Création des utilisateurs avec auth_id = id et login/password obligatoires
INSERT INTO users (id, auth_id, first_name, last_name, email, role, balance, login, password) VALUES
    -- Club de Paris
    ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Admin', 'System', 'admin@4fly.fr', 'ADMIN', 1000, 'admin', 'TemporaryPassword123!'),
    ('aaaaaaaa-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'Marie', 'Martin', 'instructor@4fly.fr', 'INSTRUCTOR', 500, 'instructor', 'TemporaryPassword123!'),
    ('aaaaaaaa-2222-2222-2222-222222222222', 'aaaaaaaa-2222-2222-2222-222222222222', 'Jean', 'Dupont', 'pilot@4fly.fr', 'PILOT', 750, 'pilot', 'TemporaryPassword123!'),
    ('aaaaaaaa-3333-3333-3333-333333333333', 'aaaaaaaa-3333-3333-3333-333333333333', 'Pierre', 'Dubois', 'mechanic@4fly.fr', 'MECHANIC', 0, 'mechanic', 'TemporaryPassword123!'),
    -- Club de Lyon
    ('bbbbbbbb-1111-1111-1111-111111111111', 'bbbbbbbb-1111-1111-1111-111111111111', 'Sophie', 'Laurent', 'sophie.laurent@4fly.fr', 'INSTRUCTOR', 600, 'sophie', 'TemporaryPassword123!'),
    ('bbbbbbbb-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', 'Lucas', 'Bernard', 'lucas.bernard@4fly.fr', 'PILOT', 300, 'lucas', 'TemporaryPassword123!'),
    -- Club de Bordeaux
    ('cccccccc-1111-1111-1111-111111111111', 'cccccccc-1111-1111-1111-111111111111', 'Emma', 'Petit', 'emma.petit@4fly.fr', 'INSTRUCTOR', 800, 'emma', 'TemporaryPassword123!'),
    ('cccccccc-2222-2222-2222-222222222222', 'cccccccc-2222-2222-2222-222222222222', 'Thomas', 'Roux', 'thomas.roux@4fly.fr', 'PILOT', 450, 'thomas', 'TemporaryPassword123!');

-- Association des utilisateurs aux clubs
INSERT INTO club_members (club_id, user_id, role, status) VALUES
    -- Club de Paris
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000000', 'ADMIN', 'ACTIVE'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'MEMBER', 'ACTIVE'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-2222-2222-2222-222222222222', 'MEMBER', 'ACTIVE'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-3333-3333-3333-333333333333', 'MEMBER', 'ACTIVE'),
    -- Club de Lyon
    ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-1111-1111-1111-111111111111', 'ADMIN', 'ACTIVE'),
    ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-2222-2222-2222-222222222222', 'MEMBER', 'ACTIVE'),
    -- Club de Bordeaux
    ('33333333-3333-3333-3333-333333333333', 'cccccccc-1111-1111-1111-111111111111', 'ADMIN', 'ACTIVE'),
    ('33333333-3333-3333-3333-333333333333', 'cccccccc-2222-2222-2222-222222222222', 'MEMBER', 'ACTIVE');

-- Création des avions
INSERT INTO aircraft (id, club_id, registration, type, name, hourly_rate, total_flight_hours, hours_before_maintenance, status) VALUES
    -- Club de Paris
    ('44444444-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'F-GBQA', 'DR400-120', 'Alpha', 150, 2345.5, 45, 'AVAILABLE'),
    ('44444444-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'F-GBQB', 'DR400-140', 'Bravo', 180, 1234.8, 30, 'AVAILABLE'),
    -- Club de Lyon
    ('55555555-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'F-GXYZ', 'PA-28', 'Charlie', 160, 3456.2, 15, 'AVAILABLE'),
    -- Club de Bordeaux
    ('66666666-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'F-ABCD', 'C152', 'Delta', 130, 4567.9, 8, 'MAINTENANCE');

-- Création des types de vol avec des UUIDs et catégories comptables valides

-- Création des réservations pour le mois en cours
WITH dates AS (
    SELECT generate_series(
        date_trunc('day', CURRENT_DATE),
        date_trunc('day', CURRENT_DATE + interval '1 month'),
        interval '1 day'
    ) AS date
)
INSERT INTO reservations (
    id, club_id, user_id, aircraft_id, instructor_id, 
    flight_type_id, start_time, end_time, status, pilot_id
)
SELECT 
    gen_random_uuid(),
    a.club_id,
    u.id,
    a.id,
    CASE WHEN random() < 0.3 THEN (
        SELECT id FROM users WHERE role = 'INSTRUCTOR' AND id IN (
            SELECT user_id FROM club_members WHERE club_id = a.club_id
        ) LIMIT 1
    ) END,
    (SELECT id FROM flight_types ORDER BY random() LIMIT 1),
    d.date + interval '9 hours' + (interval '1 hour' * floor(random() * 8)),
    d.date + interval '9 hours' + (interval '1 hour' * (floor(random() * 8) + 2)),
    'CONFIRMED',
    u.id
FROM dates d
CROSS JOIN aircraft a
JOIN users u ON u.id IN (
    SELECT user_id FROM club_members WHERE club_id = a.club_id
)
WHERE random() < 0.3
AND a.status = 'AVAILABLE';

-- Création des événements du club
INSERT INTO club_events (id, club_id, title, description, start_time, end_time, created_by, type)
SELECT
    gen_random_uuid(),
    c.id,
    CASE floor(random() * 3)
        WHEN 0 THEN 'Journée Portes Ouvertes'
        WHEN 1 THEN 'BBQ du Club'
        ELSE 'Formation Théorique'
    END,
    'Description de l''événement...',
    CURRENT_DATE + (floor(random() * 30))::integer * interval '1 day',
    CURRENT_DATE + (floor(random() * 30))::integer * interval '1 day' + interval '3 hours',
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
    CASE floor(random() * 3)
        WHEN 0 THEN 'SOCIAL'
        WHEN 1 THEN 'TRAINING'
        ELSE 'MAINTENANCE'
    END
FROM clubs c;

-- Création des annonces
INSERT INTO announcements (id, club_id, title, content, created_by, priority)
SELECT
    gen_random_uuid(),
    c.id,
    CASE floor(random() * 3)
        WHEN 0 THEN 'Maintenance planifiée'
        WHEN 1 THEN 'Nouveau règlement'
        ELSE 'Information importante'
    END,
    'Contenu de l''annonce...',
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1),
    CASE floor(random() * 3)
        WHEN 0 THEN 'LOW'
        WHEN 1 THEN 'MEDIUM'
        ELSE 'HIGH'
    END
FROM clubs c;

-- Création des entrées comptables
INSERT INTO account_entries (id, user_id, date, type, amount, payment_method, description, is_validated)
SELECT
    gen_random_uuid(),
    u.id,
    CURRENT_DATE - (floor(random() * 30))::integer * interval '1 day',
    CASE floor(random() * 3)
        WHEN 0 THEN 'FLIGHT'           -- Vol
        WHEN 1 THEN 'ACCOUNT_FUNDING'  -- Approvisionnement de compte
        ELSE 'SUBSCRIPTION'            -- Cotisation
    END,
    CASE 
        WHEN random() < 0.5 THEN -1
        ELSE 1
    END * (50 + floor(random() * 200))::numeric,
    CASE floor(random() * 3)
        WHEN 0 THEN 'CARD'
        WHEN 1 THEN 'CASH'
        ELSE 'TRANSFER'
    END,
    'Transaction ' || floor(random() * 1000)::text,
    random() < 0.8
FROM users u
CROSS JOIN generate_series(1, 5);

-- Création des licences pilotes
INSERT INTO pilot_licenses (id, user_id, type, number, valid_until, is_student)
SELECT
    gen_random_uuid(),
    u.id,
    CASE 
        WHEN u.role = 'INSTRUCTOR' THEN 'FI'
        WHEN u.role = 'PILOT' THEN 'PPL'
        ELSE 'STUDENT'
    END,
    'LIC-' || floor(random() * 10000)::text,
    CURRENT_DATE + interval '1 year',
    u.role = 'PILOT' AND random() < 0.3
FROM users u
WHERE u.role IN ('PILOT', 'INSTRUCTOR');

-- Mettre à jour toutes les colonnes qui peuvent être NULL
UPDATE auth.users SET
    confirmation_token = COALESCE(confirmation_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, '');

  ALTER TABLE auth.users 
    ALTER COLUMN confirmation_token SET DEFAULT '',
    ALTER COLUMN email_change SET DEFAULT '',
    ALTER COLUMN email_change_token_new SET DEFAULT '',
    ALTER COLUMN recovery_token SET DEFAULT '',
    ALTER COLUMN email_change_token_current SET DEFAULT '',
    ALTER COLUMN phone_change SET DEFAULT '',
    ALTER COLUMN phone_change_token SET DEFAULT '';