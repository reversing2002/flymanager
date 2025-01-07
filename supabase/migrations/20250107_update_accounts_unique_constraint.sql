-- Supprimer l'ancienne contrainte d'unicité sur le code seul
ALTER TABLE accounts DROP CONSTRAINT accounts_code_key;

-- Ajouter une nouvelle contrainte d'unicité sur le couple (code, club_id)
ALTER TABLE accounts ADD CONSTRAINT accounts_code_club_key UNIQUE (code, club_id);
