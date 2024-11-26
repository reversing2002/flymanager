import React, { useState } from "react";
import { AlertTriangle, Award } from "lucide-react";
import type { DailyChallenge as DailyChallengeType } from "../../types/training";
import { completeDailyChallenge } from "../../lib/queries/training";
import { toast } from "react-hot-toast";

interface DailyChallengeProps {
  challenge: DailyChallengeType;
  onComplete: () => void;
}

const DailyChallenge: React.FC<DailyChallengeProps> = ({
  challenge,
  onComplete,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = async () => {
    if (selectedAnswer === null) return;

    setLoading(true);
    setError(null);

    try {
      const success = selectedAnswer === challenge.question.correctAnswer;
      const points = success ? challenge.question.points : 0;

      await completeDailyChallenge(challenge.id, success, points);

      setIsAnswered(true);
      setIsCorrect(success);

      if (success) {
        toast.success(`Bonne réponse ! +${points} points`);
      } else {
        toast.error("Mauvaise réponse...");
      }

      // Attendre un peu avant de fermer pour montrer le résultat
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      console.error("Error completing challenge:", err);
      setError("Erreur lors de la validation de la réponse");
      toast.error("Erreur lors de la validation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Défi du jour</h2>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Award className="h-4 w-4" />
          <span>{challenge.question.points} points</span>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <p className="text-slate-900 mb-4">{challenge.question.question}</p>
          <div className="space-y-2">
            {challenge.question.choices.map((choice, index) => (
              <label
                key={index}
                className={`block p-4 rounded-lg border cursor-pointer transition-colors ${
                  isAnswered
                    ? index === challenge.question.correctAnswer
                      ? "border-emerald-500 bg-emerald-50"
                      : selectedAnswer === index
                      ? "border-red-500 bg-red-50"
                      : "border-slate-200"
                    : selectedAnswer === index
                    ? "border-sky-500 bg-sky-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="answer"
                    value={index}
                    checked={selectedAnswer === index}
                    onChange={() => !isAnswered && setSelectedAnswer(index)}
                    className="sr-only"
                    disabled={isAnswered}
                  />
                  <span className="text-sm text-slate-900">{choice}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={selectedAnswer === null || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Validation..." : "Valider ma réponse"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyChallenge;
