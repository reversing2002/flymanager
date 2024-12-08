import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Book, Award, AlertTriangle } from 'lucide-react';
import { getModuleQuestions, getUserProgress, updateUserProgress } from '../../lib/queries/training';
import type { TrainingQuestion, UserProgress } from '../../types/training';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface ShuffledChoice {
  text: string;
  originalIndex: number;
}

const TrainingModuleDetails = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<ShuffledChoice[]>([]);

  // Fonction pour mélanger un tableau
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    const loadData = async () => {
      if (!moduleId || !user) return;

      try {
        const [questionsData, progressData] = await Promise.all([
          getModuleQuestions(moduleId),
          getUserProgress(user.id)
        ]);

        setQuestions(questionsData);
        setProgress(progressData.find(p => p.moduleId === moduleId) || null);
      } catch (err) {
        console.error('Error loading module data:', err);
        setError('Erreur lors du chargement du module');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [moduleId, user]);

  // Mélanger les choix quand la question change
  useEffect(() => {
    if (questions[currentQuestion]) {
      const choices = questions[currentQuestion].choices.map((text, index) => ({
        text,
        originalIndex: index
      }));
      setShuffledChoices(shuffleArray(choices));
      setSelectedAnswer(null);
    }
  }, [currentQuestion, questions]);

  const handleAnswer = async () => {
    if (selectedAnswer === null || !moduleId || !user) return;

    const currentQ = questions[currentQuestion];
    const originalSelectedIndex = shuffledChoices[selectedAnswer].originalIndex;
    const isCorrect = originalSelectedIndex === currentQ.correctAnswer;

    try {
      // Obtenir le numéro de la dernière tentative
      const { data: lastAttempt } = await supabase
        .from('training_history')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .eq('question_id', currentQ.id)
        .order('created_at', { ascending: false })
        .limit(1);

      // Si pas de tentative ou dernière tentative > 1h, créer une nouvelle entrée
      const lastAttemptTime = lastAttempt?.[0]?.created_at ? new Date(lastAttempt[0].created_at) : null;
      const shouldCreateNewEntry = !lastAttemptTime || 
        (new Date().getTime() - lastAttemptTime.getTime()) > 3600000; // 1h en millisecondes

      if (shouldCreateNewEntry) {
        // Créer une nouvelle entrée
        await supabase
          .from('training_history')
          .insert({
            user_id: user.id,
            module_id: moduleId,
            question_id: currentQ.id,
            answer_index: originalSelectedIndex,
            is_correct: isCorrect,
            points_earned: isCorrect ? currentQ.points : 0,
            created_at: new Date().toISOString()
          });
      }

      // Récupérer toutes les réponses pour ce module
      const { data: moduleResponses } = await supabase
        .from('training_history')
        .select('is_correct')
        .eq('user_id', user.id)
        .eq('module_id', moduleId);

      if (!moduleResponses) return;

      // Calculer le pourcentage de réponses correctes
      const totalResponses = moduleResponses.length;
      const correctResponses = moduleResponses.filter(r => r.is_correct).length;
      const newProgress = Math.round((correctResponses / totalResponses) * 100);

      // Vérifier si une progression existe déjà
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('id, points_earned')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .single();

      const currentPoints = existingProgress?.points_earned || 0;
      const newPoints = shouldCreateNewEntry ? 
        (currentPoints + (isCorrect ? currentQ.points : 0)) : 
        currentPoints;

      if (existingProgress) {
        await supabase
          .from('user_progress')
          .update({
            progress: newProgress,
            points_earned: newPoints,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('user_progress')
          .insert({
            user_id: user.id,
            module_id: moduleId,
            progress: newProgress,
            points_earned: isCorrect ? currentQ.points : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // Passer à la question suivante ou terminer
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        navigate('/training');
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-slate-200 rounded-xl"></div>
          <div className="h-96 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error || !questions.length) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error || 'Aucune question disponible'}</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/training')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Formation</h1>
          <p className="text-slate-600">Question {currentQuestion + 1} sur {questions.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="space-y-6">
          <div>
            <p className="text-lg font-medium text-slate-900 mb-4">{currentQ.question}</p>
            <div className="space-y-2">
              {shuffledChoices.map((choice, index) => (
                <label
                  key={index}
                  className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedAnswer === index
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="answer"
                      value={index}
                      checked={selectedAnswer === index}
                      onChange={() => setSelectedAnswer(index)}
                      className="sr-only"
                    />
                    <span className="text-sm text-slate-900">{choice.text}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                <Book className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-medium">
                  {currentQuestion + 1}/{questions.length}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                <Award className="h-5 w-5 text-slate-600" />
                <span className="text-sm font-medium">
                  {currentQ.points} points
                </span>
              </div>
            </div>

            <button
              onClick={handleAnswer}
              disabled={selectedAnswer === null}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {currentQuestion < questions.length - 1 ? 'Question suivante' : 'Terminer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingModuleDetails;