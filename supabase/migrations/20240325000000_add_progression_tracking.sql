-- Create progression templates table
CREATE TABLE progression_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create progression modules table
CREATE TABLE progression_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES progression_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create progression skills table
CREATE TABLE progression_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES progression_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create student progressions table
CREATE TABLE student_progressions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES progression_templates(id) ON DELETE CASCADE,
  start_date TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create skill validations table
CREATE TABLE skill_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  progression_id UUID NOT NULL REFERENCES student_progressions(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES progression_skills(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_progression_modules_template_id ON progression_modules(template_id);
CREATE INDEX idx_progression_skills_module_id ON progression_skills(module_id);
CREATE INDEX idx_student_progressions_student_id ON student_progressions(student_id);
CREATE INDEX idx_student_progressions_template_id ON student_progressions(template_id);
CREATE INDEX idx_skill_validations_progression_id ON skill_validations(progression_id);
CREATE INDEX idx_skill_validations_skill_id ON skill_validations(skill_id);
CREATE INDEX idx_skill_validations_instructor_id ON skill_validations(instructor_id);

-- Add RLS policies
ALTER TABLE progression_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE progression_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_validations ENABLE ROW LEVEL SECURITY;

-- Everyone can view templates, modules, and skills
CREATE POLICY "Everyone can view templates" ON progression_templates
  FOR SELECT USING (true);

CREATE POLICY "Everyone can view modules" ON progression_modules
  FOR SELECT USING (true);

CREATE POLICY "Everyone can view skills" ON progression_skills
  FOR SELECT USING (true);

-- Only instructors and admins can manage templates, modules, and skills
CREATE POLICY "Instructors and admins can manage templates" ON progression_templates
  FOR ALL USING (auth.jwt() ->> 'role' IN ('INSTRUCTOR', 'ADMIN'));

CREATE POLICY "Instructors and admins can manage modules" ON progression_modules
  FOR ALL USING (auth.jwt() ->> 'role' IN ('INSTRUCTOR', 'ADMIN'));

CREATE POLICY "Instructors and admins can manage skills" ON progression_skills
  FOR ALL USING (auth.jwt() ->> 'role' IN ('INSTRUCTOR', 'ADMIN'));

-- Students can view their own progressions
CREATE POLICY "Students can view their own progressions" ON student_progressions
  FOR SELECT USING (auth.uid() = student_id);

-- Instructors and admins can view and manage all progressions
CREATE POLICY "Instructors and admins can manage all progressions" ON student_progressions
  FOR ALL USING (auth.jwt() ->> 'role' IN ('INSTRUCTOR', 'ADMIN'));

-- Students can view their own skill validations
CREATE POLICY "Students can view their own skill validations" ON skill_validations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM student_progressions sp
      WHERE sp.id = skill_validations.progression_id
      AND sp.student_id = auth.uid()
    )
  );

-- Instructors and admins can manage skill validations
CREATE POLICY "Instructors and admins can manage skill validations" ON skill_validations
  FOR ALL USING (auth.jwt() ->> 'role' IN ('INSTRUCTOR', 'ADMIN'));
