import { supabase } from '../supabase';
import type {
  ProgressionTemplate,
  ProgressionModule,
  ProgressionSkill,
  StudentProgression,
  SkillValidation,
  CreateProgressionTemplate,
  UpdateProgressionTemplate,
  CreateProgressionModule,
  UpdateProgressionModule,
  CreateProgressionSkill,
  UpdateProgressionSkill,
  CreateStudentProgression,
  CreateSkillValidation,
  ProgressionTemplateWithModules,
  StudentProgressionWithDetails,
} from '../../types/progression';

// Templates
export async function getProgressionTemplates(): Promise<ProgressionTemplate[]> {
  const { data, error } = await supabase
    .from('progression_templates')
    .select('*')
    .order('category', { ascending: true })
    .order('title', { ascending: true });

  if (error) throw new Error('Erreur lors du chargement des modèles de progression');
  return data || [];
}

export async function getProgressionTemplateWithModules(templateId: string): Promise<ProgressionTemplateWithModules> {
  const { data, error } = await supabase
    .from('progression_templates')
    .select(`
      *,
      modules:progression_modules(
        *,
        skills:progression_skills(*)
      )
    `)
    .eq('id', templateId)
    .single();

  if (error) throw new Error('Erreur lors du chargement du modèle de progression');
  
  // Trier les modules et les compétences par ordre
  const template = data as ProgressionTemplateWithModules;
  template.modules = template.modules.sort((a, b) => a.order_index - b.order_index);
  template.modules.forEach(module => {
    module.skills = module.skills.sort((a, b) => a.order_index - b.order_index);
  });
  
  return template;
}

export async function createProgressionTemplate(data: CreateProgressionTemplate): Promise<ProgressionTemplate> {
  const { data: template, error } = await supabase
    .from('progression_templates')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error('Erreur lors de la création du modèle');
  return template;
}

export async function updateProgressionTemplate(
  id: string,
  data: UpdateProgressionTemplate
): Promise<void> {
  const { error } = await supabase
    .from('progression_templates')
    .update(data)
    .eq('id', id);

  if (error) throw new Error('Erreur lors de la mise à jour du modèle');
}

export async function deleteProgressionTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('progression_templates')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Erreur lors de la suppression du modèle');
}

// Modules
export async function createProgressionModule(data: CreateProgressionModule): Promise<ProgressionModule> {
  const { data: module, error } = await supabase
    .from('progression_modules')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error('Erreur lors de la création du module');
  return module;
}

export async function updateProgressionModule(
  id: string,
  data: UpdateProgressionModule
): Promise<void> {
  const { error } = await supabase
    .from('progression_modules')
    .update(data)
    .eq('id', id);

  if (error) throw new Error('Erreur lors de la mise à jour du module');
}

export async function deleteProgressionModule(id: string): Promise<void> {
  const { error } = await supabase
    .from('progression_modules')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Erreur lors de la suppression du module');
}

// Skills
export async function createProgressionSkill(data: CreateProgressionSkill): Promise<ProgressionSkill> {
  const { data: skill, error } = await supabase
    .from('progression_skills')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error('Erreur lors de la création de la compétence');
  return skill;
}

export async function updateProgressionSkill(
  id: string,
  data: UpdateProgressionSkill
): Promise<void> {
  const { error } = await supabase
    .from('progression_skills')
    .update(data)
    .eq('id', id);

  if (error) throw new Error('Erreur lors de la mise à jour de la compétence');
}

export async function deleteProgressionSkill(id: string): Promise<void> {
  const { error } = await supabase
    .from('progression_skills')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Erreur lors de la suppression de la compétence');
}

// Student Progressions
export async function getStudentProgressions(studentId: string): Promise<StudentProgressionWithDetails[]> {
  const { data, error } = await supabase
    .from('student_progressions')
    .select(`
      *,
      student:student_id(
        id,
        first_name,
        last_name
      ),
      template:progression_templates(
        *,
        modules:progression_modules(
          *,
          skills:progression_skills(*)
        )
      ),
      validations:skill_validations(
        *,
        skill:progression_skills(*),
        instructor:users!skill_validations_instructor_id_fkey(
          id,
          first_name,
          last_name
        )
      )
    `)
    .eq('student_id', studentId);

  if (error) {
    console.error('Erreur lors du chargement des progressions:', error);
    throw new Error('Erreur lors du chargement des progressions');
  }

  // Trier les modules et les compétences par ordre
  const progressions = data || [];
  progressions.forEach(progression => {
    if (progression.template) {
      progression.template.modules = progression.template.modules.sort((a, b) => a.order_index - b.order_index);
      progression.template.modules.forEach(module => {
        module.skills = module.skills.sort((a, b) => a.order_index - b.order_index);
      });
    }
  });

  return progressions;
}

export async function createStudentProgression(data: CreateStudentProgression): Promise<StudentProgression> {
  // Check if a progression already exists for this student and template
  const { data: existingProgression } = await supabase
    .from('student_progressions')
    .select()
    .eq('student_id', data.student_id)
    .eq('template_id', data.template_id)
    .single();

  if (existingProgression) {
    // If it exists, reactivate it by setting left_at to null
    const { data: reactivatedProgression, error: updateError } = await supabase
      .from('student_progressions')
      .update({ left_at: null })
      .eq('id', existingProgression.id)
      .select()
      .single();

    if (updateError) throw new Error('Erreur lors de la réactivation de la progression');
    return reactivatedProgression;
  }

  // If no existing progression, create a new one
  const { data: progression, error } = await supabase
    .from('student_progressions')
    .insert([data])
    .select()
    .single();

  if (error) throw new Error('Erreur lors de la création de la progression');
  return progression;
}

export async function completeStudentProgression(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from('student_progressions')
    .update({
      completed_at: completed ? new Date().toISOString() : null
    })
    .eq('id', id);

  if (error) throw new Error('Erreur lors de la mise à jour de la progression');
}

export async function leaveStudentProgression(progressionId: string): Promise<void> {
  const { error } = await supabase
    .from('student_progressions')
    .update({ left_at: new Date().toISOString() })
    .eq('id', progressionId);

  if (error) throw new Error('Erreur lors de la sortie de la formation');
}

// Skill Validations
export async function validateSkill(data: CreateSkillValidation): Promise<SkillValidation> {
  // Ensure status is one of the valid values
  console.log('Validation data:', data);
  const validStatus = data.status === 'vu' || data.status === 'guidé' || data.status === 'validé' 
    ? data.status 
    : 'validé';

  const { data: validation, error } = await supabase
    .from('skill_validations')
    .insert([{
      progression_id: data.progression_id,
      skill_id: data.skill_id,
      instructor_id: data.instructor_id,
      flight_id: data.flight_id,
      comments: data.comments,
      status: validStatus,
      validated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('Erreur lors de la validation:', error);
    throw new Error('Erreur lors de la validation de la compétence');
  }
  return validation;
}

export async function removeSkillValidation(id: string): Promise<void> {
  const { error } = await supabase
    .from('skill_validations')
    .delete()
    .eq('id', id);

  if (error) throw new Error('Erreur lors de la suppression de la validation');
}

export async function toggleSkillValidation(
  progressionId: string,
  skillId: string,
  instructorId: string | null
): Promise<void> {
  // D'abord on vérifie si une validation existe déjà
  const { data: existingValidation } = await supabase
    .from('skill_validations')
    .select('id')
    .eq('progression_id', progressionId)
    .eq('skill_id', skillId)
    .single();

  if (existingValidation) {
    // Si une validation existe, on la supprime
    const { error } = await supabase
      .from('skill_validations')
      .delete()
      .eq('progression_id', progressionId)
      .eq('skill_id', skillId);

    if (error) {
      console.error('Erreur lors de la suppression de la validation:', error);
      throw new Error('Erreur lors de la suppression de la validation');
    }
  } else {
    // Si aucune validation n'existe, on en crée une

    const { error } = await supabase
      .from('skill_validations')
      .insert({
        progression_id: progressionId,
        skill_id: skillId,
        instructor_id: instructorId,
        validated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erreur lors de la création de la validation:', error);
      throw new Error('Erreur lors de la création de la validation');
    }
  }
}
