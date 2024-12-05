-- Insertion des utilisateurs de base
INSERT INTO public.users (id, first_name, last_name, email, phone, gender, birth_date, club) VALUES
    -- Étudiants
    ('aaaaaaaa-5555-5555-5555-555555555555', 'Jean', 'Dupont', 'jean.dupont@example.com', '+33612345678', 'M', '2000-01-01', 'Paris'),
    ('bbbbbbbb-5555-5555-5555-555555555555', 'Marie', 'Durand', 'marie.durand@example.com', '+33623456789', 'F', '2001-02-02', 'Lyon'),
    ('cccccccc-5555-5555-5555-555555555555', 'Paul', 'Martin', 'paul.martin@example.com', '+33634567890', 'M', '2002-03-03', 'Bordeaux'),
    ('dddddddd-5555-5555-5555-555555555555', 'Léa', 'Bernard', 'lea.bernard@example.com', '+33645678901', 'F', '2003-04-04', 'St Chamond');
