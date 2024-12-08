-- Create training history table
CREATE TABLE training_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES training_questions(id) ON DELETE CASCADE,
  answer_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_training_history_user ON training_history(user_id);
CREATE INDEX idx_training_history_module ON training_history(module_id);
CREATE INDEX idx_training_history_question ON training_history(question_id);
