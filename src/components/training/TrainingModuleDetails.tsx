import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Book, Award, AlertTriangle } from 'lucide-react';
import { getModuleQuestions, getUserProgress, updateUserProgress } from '../../lib/queries/training';
import type { TrainingQuestion, UserProgress } from '../../types/training';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

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

  const handleAnswer = async () => {
    if (selectedAnswer === null || !moduleId || !user) return;

    const currentQ = questions[currentQuestion];
    const isCorrect = selectedAnswer === currentQ.correctAnswer;

    try {
      // Enregistrer la réponse dans l'historique
      await supabase
        .from('training_history')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          question_id: currentQ.id,
          answer_index: selectedAnswer,
          is_correct: isCorrect,
          points_earned: isCorrect ? currentQ.points : 0,
          created_at: new Date().toISOString()
        });

      // Récupérer toutes les réponses pour ce module
      const { data: moduleResponses } = await supabase
        .from('training_history')
        .select('is_correct')
        .eq('user_id', user.id)
        .eq('module_id', moduleId);

      // Calculer le pourcentage de réponses correctes
      const totalResponses = moduleResponses?.length || 0;
      const correctResponses = moduleResponses?.filter(r => r.is_correct)?.length || 0;
      const newProgress = totalResponses > 0 ? Math.round((correctResponses / totalResponses) * 100) : 0;

      // Vérifier si une progression existe déjà
      const { data: existingProgress } = await supabase
        .from('user_progress')
        .select('id, points_earned')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .single();

      const currentPoints = existingProgress?.points_earned || 0;
      const newPoints = currentPoints + (isCorrect ? currentQ.points : 0);

      if (existingProgress) {
        // Mettre à jour la progression existante
        await supabase
          .from('user_progress')
          .update({
            progress: newProgress,
            points_earned: newPoints,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      } else {
        // Créer une nouvelle progression
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

      // Feedback à l'utilisateur
      toast[isCorrect ? 'success' : 'error'](
        isCorrect ? 'Bonne réponse !' : 'Mauvaise réponse...'
      );

      // Passer à la question suivante ou terminer
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
      } else {
        // Module terminé
        toast.success('Module terminé !');
        navigate('/training');
      }
    } catch (err) {
      console.error('Error updating progress:', err);
      toast.error('Erreur lors de la mise à jour de la progression');
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
              {currentQ.choices.map((choice, index) => (
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
                    <span className="text-sm text-slate-900">{choice}</span>
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