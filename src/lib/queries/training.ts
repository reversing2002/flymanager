import { supabase } from '../supabase';
import type { TrainingModule, TrainingQuestion, UserProgress } from '../../types/training';

// Training Modules
export async function getTrainingModules(): Promise<TrainingModule[]> {
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching modules:', error);
    throw new Error('Erreur lors du chargement des modules');
  }
  return data || [];
}

export async function getModuleQuestions(moduleId: string): Promise<TrainingQuestion[]> {
  const { data, error } = await supabase
    .from('training_questions')
    .select('*')
    .eq('module_id', moduleId)
    .order('created_at');

  if (error) {
    console.error('Error fetching questions:', error);
    throw new Error('Erreur lors du chargement des questions');
  }

  // Transformer les données pour correspondre à l'interface TypeScript
  return (data || []).map(question => ({
    id: question.id,
    moduleId: question.module_id,
    question: question.question,
    choices: question.choices,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    points: question.points,
    createdAt: question.created_at,
    updatedAt: question.updated_at
  }));
}

// User Progress
export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function saveUserProgress(
  userId: string,
  questionId: string,
  success: boolean,
  points: number
): Promise<void> {
  const { error } = await supabase.from('user_progress').insert([
    {
      user_id: userId,
      question_id: questionId,
      success,
      points,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) throw error;
}

export async function updateUserProgress(
  userId: string,
  moduleId: string,
  progress: number,
  pointsEarned: number
): Promise<void> {
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      module_id: moduleId,
      progress,
      points_earned: pointsEarned,
      last_access: new Date().toISOString()
    });

  if (error) {
    console.error('Error updating progress:', error);
    throw new Error('Erreur lors de la mise à jour de la progression');
  }
}

export async function updateAllProgressPercentages(userId: string) {
  try {
    // 1. Récupérer tous les modules auxquels l'utilisateur a répondu
    const { data: userResponses } = await supabase
      .from('training_history')
      .select('module_id')
      .eq('user_id', userId);

    if (!userResponses) return;

    // Obtenir les modules uniques
    const uniqueModules = [...new Set(userResponses.map(r => r.module_id))];

    // 2. Pour chaque module, calculer le nouveau pourcentage
    for (const module_id of uniqueModules) {
      // Récupérer toutes les réponses pour ce module
      const { data: moduleResponses } = await supabase
        .from('training_history')
        .select('is_correct')
        .eq('user_id', userId)
        .eq('module_id', module_id);

      if (!moduleResponses) continue;

      // Calculer le pourcentage de réponses correctes
      const totalResponses = moduleResponses.length;
      const correctResponses = moduleResponses.filter(r => r.is_correct).length;
      const newProgress = Math.round((correctResponses / totalResponses) * 100);

      // Mettre à jour la progression dans user_progress
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('id, points_earned')
        .eq('user_id', userId)
        .eq('module_id', module_id)
        .single();

      if (existingProgress) {
        await supabase
          .from('user_progress')
          .update({
            progress: newProgress,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('user_progress')
          .insert({
            user_id: userId,
            module_id: module_id,
            progress: newProgress,
            points_earned: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    }
  } catch (error) {
    console.error('Error updating progress percentages:', error);
    throw new Error('Erreur lors de la mise à jour des pourcentages de progression');
  }
}

// Module Management
export async function createTrainingModule(moduleData: Partial<TrainingModule>): Promise<TrainingModule> {
  const { data, error } = await supabase
    .from('training_modules')
    .insert([moduleData])
    .select()
    .single();

  if (error) {
    console.error('Error creating module:', error);
    throw new Error('Erreur lors de la création du module');
  }
  return data;
}

export async function updateTrainingModule(id: string, moduleData: Partial<TrainingModule>): Promise<void> {
  const { error } = await supabase
    .from('training_modules')
    .update(moduleData)
    .eq('id', id);

  if (error) {
    console.error('Error updating module:', error);
    throw new Error('Erreur lors de la mise à jour du module');
  }
}

export async function deleteTrainingModule(id: string): Promise<void> {
  const { error } = await supabase
    .from('training_modules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting module:', error);
    throw new Error('Erreur lors de la suppression du module');
  }
}

// Question Management
export async function createQuestion(questionData: Partial<TrainingQuestion>): Promise<TrainingQuestion> {
  // Transformer les données pour la base de données
  const dbData = {
    module_id: questionData.moduleId,
    question: questionData.question,
    choices: questionData.choices,
    correct_answer: questionData.correctAnswer,
    explanation: questionData.explanation,
    points: questionData.points
  };

  const { data, error } = await supabase
    .from('training_questions')
    .insert([dbData])
    .select()
    .single();

  if (error) {
    console.error('Error creating question:', error);
    throw new Error('Erreur lors de la création de la question');
  }

  // Transformer la réponse pour correspondre à l'interface TypeScript
  return {
    id: data.id,
    moduleId: data.module_id,
    question: data.question,
    choices: data.choices,
    correctAnswer: data.correct_answer,
    explanation: data.explanation,
    points: data.points,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updateQuestion(id: string, questionData: Partial<TrainingQuestion>): Promise<void> {
  // Transformer les données pour la base de données
  const dbData = {
    ...(questionData.moduleId && { module_id: questionData.moduleId }),
    ...(questionData.question && { question: questionData.question }),
    ...(questionData.choices && { choices: questionData.choices }),
    ...(typeof questionData.correctAnswer === 'number' && { correct_answer: questionData.correctAnswer }),
    ...(questionData.explanation !== undefined && { explanation: questionData.explanation }),
    ...(questionData.points && { points: questionData.points })
  };

  const { error } = await supabase
    .from('training_questions')
    .update(dbData)
    .eq('id', id);

  if (error) {
    console.error('Error updating question:', error);
    throw new Error('Erreur lors de la mise à jour de la question');
  }
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('training_questions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting question:', error);
    throw new Error('Erreur lors de la suppression de la question');
  }
}

export async function getTrainingHistory(userId: string) {
  const { data, error } = await supabase
    .from('training_history')
    .select(`
      *,
      module:training_modules (
        title,
        description
      ),
      question:training_questions (
        question,
        choices,
        correct_answer
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching training history:', error);
    throw new Error('Erreur lors de la récupération de l\'historique');
  }

  // Convert snake_case to camelCase for frontend
  return (data || []).map(item => ({
    ...item,
    question: {
      ...item.question,
      correctAnswer: item.question.correct_answer
    }
  }));
}