import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getRandomQuestions, getDifficultQuestions } from '../../lib/queries/training';
import type { TrainingQuestion } from '../../types/training';

interface ShuffledChoice {
  text: string;
  originalIndex: number;
}

type QuizMode = 'random' | 'difficult';

const QuizMix = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<(TrainingQuestion & { module: { title: string } })[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [shuffledChoices, setShuffledChoices] = useState<ShuffledChoice[]>([]);
  const [mode, setMode] = useState<QuizMode>('random');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadQuestions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fetchedQuestions = mode === 'random'
        ? await getRandomQuestions(user.id)
        : await getDifficultQuestions(user.id);
      setQuestions(fetchedQuestions);
      setCurrentQuestion(0);
      setScore({ correct: 0, total: 0 });
      
      if (fetchedQuestions[0]) {
        const choices = fetchedQuestions[0].choices.map((text, index) => ({
          text,
          originalIndex: index
        }));
        setShuffledChoices(shuffleArray(choices));
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [user, mode]);

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
    if (selectedAnswer === null || !user) return;

    const currentQ = questions[currentQuestion];
    const originalSelectedIndex = shuffledChoices[selectedAnswer].originalIndex;
    const isCorrect = originalSelectedIndex === currentQ.correctAnswer;

    try {
      // Log pour debug
      console.log({
        selectedAnswer,
        originalSelectedIndex,
        correctAnswer: currentQ.correctAnswer,
        isCorrect,
        currentQuestion,
        totalQuestions: questions.length
      });

      // Enregistrer la réponse
      await supabase
        .from('training_history')
        .insert({
          user_id: user.id,
          module_id: currentQ.module.id,
          question_id: currentQ.id,
          answer_index: originalSelectedIndex,
          is_correct: isCorrect,
          points_earned: isCorrect ? currentQ.points : 0,
          created_at: new Date().toISOString()
        });

      // Mettre à jour le score
      setScore(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1
      }));

      // Afficher un feedback avec plus d'informations
      const feedback = document.createElement('div');
      feedback.className = `fixed bottom-4 right-4 p-4 rounded ${
        isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`;
      feedback.textContent = isCorrect 
        ? '✓ Bonne réponse !' 
        : `✗ Mauvaise réponse. La bonne réponse était : ${currentQ.choices[currentQ.correctAnswer]}`;
      document.body.appendChild(feedback);
      setTimeout(() => feedback.remove(), 3000);

      // Passer à la question suivante
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null); // Reset la sélection pour la prochaine question
      } else {
        // C'est la dernière question, afficher l'écran de fin
        setCurrentQuestion(questions.length);
      }
    } catch (err) {
      console.error('Error saving answer:', err);
    }
  };

  // Écran de fin du quiz
  if (currentQuestion >= questions.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Quiz terminé !</h2>
        <p className="text-lg mb-4">
          Score final : {score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
        </p>
        <div className="space-x-4">
          <button
            onClick={() => {
              setCurrentQuestion(0);
              setScore({ correct: 0, total: 0 });
              loadQuestions();
            }}
            className="bg-sky-600 text-white px-4 py-2 rounded hover:bg-sky-700"
          >
            Recommencer
          </button>
          <button
            onClick={() => {
              setMode(mode === 'random' ? 'difficult' : 'random');
              setCurrentQuestion(0);
              setScore({ correct: 0, total: 0 });
            }}
            className="border border-slate-300 px-4 py-2 rounded hover:bg-slate-50"
          >
            Changer de mode
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Quiz Mix - Mode {mode === 'random' ? 'Aléatoire' : 'Révision'}
        </h2>
        <button
          onClick={() => setMode(mode === 'random' ? 'difficult' : 'random')}
          className="border border-slate-300 px-4 py-2 rounded hover:bg-slate-50"
        >
          Changer de mode
        </button>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>Question {currentQuestion + 1}/{questions.length}</span>
        <span>Score : {score.correct}/{score.total}</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="mb-2 text-sm text-gray-600">
          Module : {currentQ.module.title}
        </div>
        <p className="text-lg font-medium mb-6">{currentQ.question}</p>
        <div className="space-y-4">
          {shuffledChoices.map((choice, index) => (
            <button
              key={index}
              onClick={() => setSelectedAnswer(index)}
              className={`w-full text-left px-4 py-3 rounded border ${
                selectedAnswer === index
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'border-slate-300 hover:bg-slate-50'
              }`}
            >
              {choice.text}
            </button>
          ))}
        </div>
      </div>

      <button
        className={`w-full py-3 rounded font-medium ${
          selectedAnswer === null
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-sky-600 text-white hover:bg-sky-700'
        }`}
        disabled={selectedAnswer === null}
        onClick={handleAnswer}
      >
        Valider
      </button>
    </div>
  );
};

export default QuizMix;
