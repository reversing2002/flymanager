-- Supprimer la colonne password de la table users puisque les mots de passe sont maintenant gérés par auth.users
ALTER TABLE users DROP COLUMN password;
