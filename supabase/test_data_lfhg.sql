-- Nettoyage des tables spécifiques au club
DELETE FROM chat_room_members WHERE room_id IN (
    SELECT id FROM chat_rooms WHERE club_id = '44444444-4444-4444-4444-444444444444'
);
DELETE FROM chat_rooms WHERE club_id = '44444444-4444-4444-4444-444444444444';
DELETE FROM club_members WHERE club_id = '44444444-4444-4444-4444-444444444444';
DELETE FROM aircraft WHERE club_id = '44444444-4444-4444-4444-444444444444';
DELETE FROM users WHERE email LIKE '%@ac-stchamond.fr';

-- Création du club de Saint Chamond
INSERT INTO clubs (id, name, code, email, phone, address) VALUES
    ('44444444-4444-4444-4444-444444444444', 'Aéroclub de Saint Chamond', 'ACSC', 'contact@ac-stchamond.fr', '0477223344', 'Aérodrome de Saint-Chamond-L''Horme, 42152 L''Horme');

-- Création des utilisateurs
INSERT INTO users (id, auth_id, first_name, last_name, email, role, balance, login, password) VALUES
    -- Admin
    ('dddddddd-1111-1111-1111-111111111111', 'dddddddd-1111-1111-1111-111111111111', 'Pascal', 'Descombe', 'pascal.descombe@ac-stchamond.fr', 'ADMIN', 1000, 'pascal', 'TemporaryPassword123!'),
    -- Mécanicien
    ('dddddddd-2222-2222-2222-222222222222', 'dddddddd-2222-2222-2222-222222222222', 'André', 'Jacoud', 'andre.jacoud@ac-stchamond.fr', 'MECHANIC', 0, 'andre', 'TemporaryPassword123!'),
    -- Pilote
    ('dddddddd-3333-3333-3333-333333333333', 'dddddddd-3333-3333-3333-333333333333', 'Eddy', 'Fayet', 'eddy.fayet@ac-stchamond.fr', 'PILOT', 500, 'eddy', 'TemporaryPassword123!'),
    -- Instructeur
    ('dddddddd-4444-4444-4444-444444444444', 'dddddddd-4444-4444-4444-444444444444', 'Nicolas', 'Becuwe', 'nicolas.becuwe@ac-stchamond.fr', 'INSTRUCTOR', 800, 'nicolas', 'TemporaryPassword123!');

-- Association des utilisateurs au club
INSERT INTO club_members (club_id, user_id, role, status) VALUES
    ('44444444-4444-4444-4444-444444444444', 'dddddddd-1111-1111-1111-111111111111', 'ADMIN', 'ACTIVE'),
    ('44444444-4444-4444-4444-444444444444', 'dddddddd-2222-2222-2222-222222222222', 'MEMBER', 'ACTIVE'),
    ('44444444-4444-4444-4444-444444444444', 'dddddddd-3333-3333-3333-333333333333', 'MEMBER', 'ACTIVE'),
    ('44444444-4444-4444-4444-444444444444', 'dddddddd-4444-4444-4444-444444444444', 'MEMBER', 'ACTIVE');

-- Création des avions
INSERT INTO aircraft (id, club_id, registration, type, name, hourly_rate, total_flight_hours, hours_before_maintenance, status) VALUES
    ('eeeeeeee-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'F-BXTP', 'MS893E', 'Rallye 180', 180, 5678.3, 35, 'AVAILABLE'),
    ('eeeeeeee-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'F-HBPZ', 'MS893A', 'Rallye 150', 160, 3456.7, 42, 'AVAILABLE'),
    ('eeeeeeee-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'F-CZ', 'SAVANNAH', 'Savannah ULM', 120, 876.4, 25, 'AVAILABLE');

-- Création des salons de discussion
INSERT INTO chat_rooms (id, club_id, name, type, creator_id) VALUES
    ('ffffffff-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Sorties Club', 'PILOT_GROUP', 'dddddddd-1111-1111-1111-111111111111'),
    ('ffffffff-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Soirées et évenements', 'INSTRUCTOR_GROUP', 'dddddddd-1111-1111-1111-111111111111');

-- Association des membres aux salons
INSERT INTO chat_room_members (room_id, user_id) 
SELECT 'ffffffff-1111-1111-1111-111111111111', id 
FROM users 
WHERE email LIKE '%@ac-stchamond.fr' 
AND role IN ('PILOT', 'INSTRUCTOR', 'ADMIN');

INSERT INTO chat_room_members (room_id, user_id) 
SELECT 'ffffffff-2222-2222-2222-222222222222', id 
FROM users 
WHERE email LIKE '%@ac-stchamond.fr'
AND role = 'INSTRUCTOR';

-- Création des licences pilotes
INSERT INTO pilot_licenses (id, user_id, type, number, valid_until, is_student) VALUES
    (uuid_generate_v4(), 'dddddddd-4444-4444-4444-444444444444', 'FI', 'FI-2023-456', CURRENT_DATE + interval '2 years', false),
    (uuid_generate_v4(), 'dddddddd-3333-3333-3333-333333333333', 'PPL', 'PPL-2023-789', CURRENT_DATE + interval '1 year', false);