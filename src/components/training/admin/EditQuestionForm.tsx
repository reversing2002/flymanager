import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { TrainingQuestion } from "../../../types/training";
import { supabase } from "../../../lib/supabase";
import { toast } from "react-hot-toast";

interface EditQuestionFormProps {
  moduleId: string;
  question?: TrainingQuestion;
  onClose: () => void;
  onSuccess: () => void;
}

const EditQuestionForm: React.FC<EditQuestionFormProps> = ({
  moduleId,
  question,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    question: question?.question || "",
    choices: question?.choices || ["", "", "", ""],
    correctAnswer: question?.correctAnswer || 0,
    explanation: question?.explanation || "",
    points: question?.points || 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (question) {
        // Update existing question
        const { error: updateError } = await supabase
          .from("training_questions")
          .update({
            question: formData.question,
            choices: formData.choices,
            correct_answer: formData.correctAnswer,
            explanation: formData.explanation,
            points: formData.points,
          })
          .eq("id", question.id);

        if (updateError) throw updateError;
        toast.success("Question mise à jour");
      } else {
        // Create new question
        const { error: createError } = await supabase
          .from("training_questions")
          .insert({
            module_id: moduleId,
            question: formData.question,
            choices: formData.choices,
            correct_answer: formData.correctAnswer,
            explanation: formData.explanation,
            points: formData.points,
          });

        if (createError) throw createError;
        toast.success("Question créée");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error saving question:", err);
      setError("Erreur lors de l'enregistrement de la question");
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {question ? "Modifier la question" : "Nouvelle question"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Question
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Choix
            </label>
            <div className="space-y-2">
              {formData.choices.map((choice, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={formData.correctAnswer === index}
                    onChange={() =>
                      setFormData({ ...formData, correctAnswer: index })
                    }
                    className="rounded-full border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <input
                    type="text"
                    value={choice}
                    onChange={(e) => {
                      const newChoices = [...formData.choices];
                      newChoices[index] = e.target.value;
                      setFormData({ ...formData, choices: newChoices });
                    }}
                    className="flex-1 rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    placeholder={`Choix ${index + 1}`}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Explication
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
              rows={2}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              placeholder="Explication de la réponse correcte (optionnel)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Points
            </label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) =>
                setFormData({ ...formData, points: parseInt(e.target.value) })
              }
              min="0"
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditQuestionForm;