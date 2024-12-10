-- Supprimer la contrainte unique sur user_id et question_id
ALTER TABLE training_history 
DROP CONSTRAINT IF EXISTS training_history_user_id_question_id_key;
