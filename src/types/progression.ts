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
  code: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressionSkill {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  code: string;
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
  flight_id: string | null;
  validated_at: string;
  status: 'vu' | 'guidé' | 'validé';
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

export interface CreateProgressionModule {
  template_id: string;
  title: string;
  description: string | null;
  code: string;
  order_index: number;
}

export interface UpdateProgressionModule {
  title?: string;
  description?: string | null;
  code?: string;
  order_index?: number;
}

export interface CreateProgressionSkill {
  module_id: string;
  title: string;
  description: string | null;
  code: string;
  order_index: number;
}

export interface UpdateProgressionSkill {
  title?: string;
  description?: string | null;
  code?: string;
  order_index?: number;
}

export type CreateStudentProgression = Omit<StudentProgression, 'id' | 'created_at' | 'updated_at' | 'completed_at'>;
export type UpdateStudentProgression = { completed_at: string | null };

export interface CreateSkillValidation {
  progression_id: string;
  skill_id: string;
  instructor_id: string;
  flight_id?: string | null;
  comments: string | null;
  status: 'vu' | 'guidé' | 'validé';
}
