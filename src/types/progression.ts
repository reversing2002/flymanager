export interface ProgressionTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressionModule {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressionSkill {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface StudentProgression {
  id: string;
  student_id: string;
  template_id: string;
  start_date: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkillValidation {
  id: string;
  progression_id: string;
  skill_id: string;
  instructor_id: string | null;
  validated_at: string;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
}

export interface ProgressionModuleWithSkills extends ProgressionModule {
  skills: ProgressionSkill[];
}

export interface ProgressionTemplateWithModules extends ProgressionTemplate {
  modules: ProgressionModuleWithSkills[];
}

export interface StudentProgressionWithDetails extends StudentProgression {
  student: {
    id: string;
    first_name: string;
    last_name: string;
  };
  template: ProgressionTemplateWithModules;
  validations: (SkillValidation & {
    skill: ProgressionSkill;
    instructor: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  })[];
}

export type CreateProgressionTemplate = Omit<ProgressionTemplate, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProgressionTemplate = Partial<CreateProgressionTemplate>;

export type CreateProgressionModule = Omit<ProgressionModule, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProgressionModule = Partial<CreateProgressionModule>;

export type CreateProgressionSkill = Omit<ProgressionSkill, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProgressionSkill = Partial<CreateProgressionSkill>;

export type CreateStudentProgression = Omit<StudentProgression, 'id' | 'created_at' | 'updated_at' | 'completed_at'>;
export type UpdateStudentProgression = { completed_at: string | null };

export type CreateSkillValidation = Omit<SkillValidation, 'id' | 'created_at' | 'updated_at' | 'instructor' | 'skill'>;
