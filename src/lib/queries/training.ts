import { supabase } from '../supabase';
import type { TrainingModule, TrainingQuestion, UserProgress, DailyChallenge } from '../../types/training';

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
  return data || [];
}

// User Progress
export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  const { data, error } = await supabase
    .from('user_progress')
    .select(`
      *,
      module:module_id (
        id,
        title,
        description,
        level,
        category,
        points
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user progress:', error);
    throw new Error('Erreur lors du chargement de la progression');
  }
  return data || [];
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
  const { data, error } = await supabase
    .from('training_questions')
    .insert([{
      module_id: questionData.moduleId,
      question: questionData.question,
      choices: questionData.choices,
      correct_answer: questionData.correctAnswer,
      explanation: questionData.explanation,
      points: questionData.points
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating question:', error);
    throw new Error('Erreur lors de la création de la question');
  }
  return {
    ...data,
    moduleId: data.module_id,
    correctAnswer: data.correct_answer
  } as TrainingQuestion;
}

export async function updateQuestion(id: string, questionData: Partial<TrainingQuestion>): Promise<void> {
  const { error } = await supabase
    .from('training_questions')
    .update({
      question: questionData.question,
      choices: questionData.choices,
      correct_answer: questionData.correctAnswer,
      explanation: questionData.explanation,
      points: questionData.points
    })
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

// Daily Challenges
export async function getDailyChallenge(userId: string): Promise<DailyChallenge | null> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_challenges')
    .select(`
      *,
      question:question_id (
        id,
        question,
        choices,
        correct_answer,
        explanation,
        points
      )
    `)
    .eq('user_id', userId)
    .eq('challenge_date', today)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No challenge found
    console.error('Error fetching daily challenge:', error);
    throw new Error('Erreur lors du chargement du défi quotidien');
  }
  
  return data;
}

export async function createDailyChallenge(questionId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id')
    .in('role', ['PILOT', 'INSTRUCTOR']);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw new Error('Erreur lors de la récupération des utilisateurs');
  }

  // Create challenge for each user
  const challenges = users.map(user => ({
    user_id: user.id,
    question_id: questionId,
    challenge_date: today,
    status: 'PENDING',
    points_earned: 0
  }));

  const { error: insertError } = await supabase
    .from('daily_challenges')
    .insert(challenges);

  if (insertError) {
    console.error('Error creating challenges:', insertError);
    throw new Error('Erreur lors de la création des défis');
  }
}

export async function completeDailyChallenge(
  challengeId: string,
  success: boolean,
  pointsEarned: number
): Promise<void> {
  const { error } = await supabase
    .from('daily_challenges')
    .update({
      status: success ? 'COMPLETED' : 'FAILED',
      points_earned: pointsEarned,
      updated_at: new Date().toISOString()
    })
    .eq('id', challengeId);

  if (error) {
    console.error('Error completing challenge:', error);
    throw new Error('Erreur lors de la validation du défi');
  }
}