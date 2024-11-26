import React, { useState, useEffect } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import {
  getTrainingModules,
  getModuleQuestions,
  createDailyChallenge,
} from "../../../lib/queries/training";
import type { TrainingModule, TrainingQuestion } from "../../../types/training";
import { toast } from "react-hot-toast";

interface DailyChallengeManagerProps {
  onClose: () => void;
}

const DailyChallengeManager: React.FC<DailyChallengeManagerProps> = ({
  onClose,
}) => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [selectedQuestions, setSelectedQuestions] = useState<
    TrainingQuestion[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      loadQuestions(selectedModule);
    } else {
      setQuestions([]);
    }
  }, [selectedModule]);

  const loadModules = async () => {
    try {
      const data = await getTrainingModules();
      setModules(data);
    } catch (err) {
      console.error("Error loading modules:", err);
      setError("Erreur lors du chargement des modules");
    }
  };

  const loadQuestions = async (moduleId: string) => {
    try {
      const data = await getModuleQuestions(moduleId);
      setQuestions(data);
    } catch (err) {
      console.error("Error loading questions:", err);
      setError("Erreur lors du chargement des questions");
    }
  };

  const handleAddQuestion = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && !selectedQuestions.some((q) => q.id === questionId)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== questionId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Créer un défi pour chaque question sélectionnée
      await Promise.all(
        selectedQuestions.map((question) => createDailyChallenge(question.id))
      );
      toast.success(`${selectedQuestions.length} défis quotidiens créés`);
      onClose();
    } catch (err) {
      console.error("Error creating challenges:", err);
      setError("Erreur lors de la création des défis");
      toast.error("Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Créer des défis quotidiens</h2>

      {error && (
        <div className="p-4 mb-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Module
          </label>
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            required
          >
            <option value="">Sélectionner un module</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
        </div>

        {selectedModule && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Questions
            </label>
            <select
              onChange={(e) => handleAddQuestion(e.target.value)}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              value=""
            >
              <option value="">Sélectionner une question à ajouter</option>
              {questions
                .filter((q) => !selectedQuestions.some((sq) => sq.id === q.id))
                .map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.question}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Liste des questions sélectionnées */}
        {selectedQuestions.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Questions sélectionnées ({selectedQuestions.length})
            </label>
            <div className="space-y-2">
              {selectedQuestions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                >
                  <span className="text-sm text-slate-700">
                    {question.question}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(question.id)}
                    className="p-1 text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
            disabled={loading || selectedQuestions.length === 0}
          >
            {loading ? (
              "Création..."
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>
                  Créer {selectedQuestions.length} défi
                  {selectedQuestions.length > 1 ? "s" : ""}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DailyChallengeManager;
