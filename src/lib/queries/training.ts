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

export async function getRandomQuestions(userId: string, count: number = 10) {
  const { data: questions } = await supabase
    .from('training_questions')
    .select(`
      *,
      module:training_modules (
        id,
        title
      )
    `)
    .limit(count);

  return (questions || []).map(question => ({
    id: question.id,
    moduleId: question.module_id,
    question: question.question,
    choices: question.choices,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    points: question.points,
    createdAt: question.created_at,
    updatedAt: question.updated_at,
    module: question.module
  }));
}

export async function getDifficultQuestions(userId: string, count: number = 10) {
  // 1. Récupérer l'historique des réponses avec les questions
  const { data: history } = await supabase
    .from('training_history')
    .select(`
      question_id,
      is_correct
    `)
    .eq('user_id', userId);

  if (!history) return [];

  // 2. Calculer le taux de réussite par question
  const questionStats = history.reduce((acc: { [key: string]: { total: number; correct: number } }, curr) => {
    if (!acc[curr.question_id]) {
      acc[curr.question_id] = { total: 0, correct: 0 };
    }
    acc[curr.question_id].total++;
    if (curr.is_correct) {
      acc[curr.question_id].correct++;
    }
    return acc;
  }, {});

  // 3. Calculer le pourcentage de réussite et trier
  const questionSuccessRates = Object.entries(questionStats)
    .map(([questionId, stats]) => ({
      questionId,
      successRate: (stats.correct / stats.total) * 100
    }))
    .sort((a, b) => a.successRate - b.successRate);

  // 4. Prendre les questions avec le plus faible taux de réussite
  const difficultQuestionIds = questionSuccessRates
    .slice(0, count)
    .map(q => q.questionId);

  // 5. Récupérer les détails des questions
  const { data: questions } = await supabase
    .from('training_questions')
    .select(`
      *,
      module:training_modules (
        id,
        title
      )
    `)
    .in('id', difficultQuestionIds);

  return (questions || []).map(question => ({
    id: question.id,
    moduleId: question.module_id,
    question: question.question,
    choices: question.choices,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    points: question.points,
    createdAt: question.created_at,
    updatedAt: question.updated_at,
    module: question.module
  }));
}

export async function getStudentPerformanceStats(userId: string) {
  // 1. Récupérer l'historique des réponses avec les modules et questions
  const { data: history } = await supabase
    .from('training_history')
    .select(`
      *,
      question:training_questions(
        id,
        module_id,
        question,
        points
      ),
      module:training_modules(
        id,
        title,
        category
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!history) return [];

  // 2. Organiser les données par catégorie et module
  const stats = history.reduce((acc: any, attempt) => {
    const category = attempt.module.category;
    const moduleId = attempt.module.id;
    const moduleTitle = attempt.module.title;

    if (!acc[category]) {
      acc[category] = {
        total: 0,
        correct: 0,
        modules: {}
      };
    }

    if (!acc[category].modules[moduleId]) {
      acc[category].modules[moduleId] = {
        title: moduleTitle,
        total: 0,
        correct: 0,
        recentAttempts: []
      };
    }

    // Mettre à jour les statistiques globales de la catégorie
    acc[category].total++;
    if (attempt.is_correct) acc[category].correct++;

    // Mettre à jour les statistiques du module
    acc[category].modules[moduleId].total++;
    if (attempt.is_correct) acc[category].modules[moduleId].correct++;

    // Garder les 5 dernières tentatives
    if (acc[category].modules[moduleId].recentAttempts.length < 5) {
      acc[category].modules[moduleId].recentAttempts.push({
        isCorrect: attempt.is_correct,
        date: attempt.created_at
      });
    }

    return acc;
  }, {});

  // 3. Calculer les pourcentages et identifier les forces/faiblesses
  Object.keys(stats).forEach(category => {
    stats[category].successRate = Math.round((stats[category].correct / stats[category].total) * 100);
    
    Object.keys(stats[category].modules).forEach(moduleId => {
      const module = stats[category].modules[moduleId];
      module.successRate = Math.round((module.correct / module.total) * 100);
      
      // Déterminer le statut du module
      if (module.successRate >= 80) {
        module.status = 'strong';
      } else if (module.successRate <= 50) {
        module.status = 'weak';
      } else {
        module.status = 'moderate';
      }
    });
  });

  return stats;
}