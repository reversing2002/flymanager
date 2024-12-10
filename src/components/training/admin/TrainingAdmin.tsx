import React, { useState, useEffect } from 'react';
import { getTrainingModules, getModuleQuestions, deleteTrainingModule, deleteQuestion } from '../../../lib/queries/training';
import type { TrainingModule, TrainingQuestion } from '../../../types/training';
import ModuleList from './ModuleList';
import ModuleForm from './ModuleForm';
import QuestionForm from './QuestionForm';
import QuestionList from './QuestionList';
import { Plus, Upload, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

const TrainingAdmin = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<TrainingQuestion | null>(null);
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadModules();
  }, []);

  useEffect(() => {
    if (selectedModule) {
      loadQuestions(selectedModule.id);
    }
  }, [selectedModule]);

  const loadModules = async () => {
    try {
      const data = await getTrainingModules();
      setModules(data);
    } catch (error) {
      console.error('Error loading modules:', error);
      toast.error('Erreur lors du chargement des modules');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (moduleId: string) => {
    try {
      const data = await getModuleQuestions(moduleId);
      setQuestions(data);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Erreur lors du chargement des questions');
    }
  };

  const handleEditModule = (module: TrainingModule) => {
    setEditingModule(module);
    setShowModuleForm(true);
  };

  const handleManageQuestions = async (module: TrainingModule) => {
    setSelectedModule(module);
    await loadQuestions(module.id);
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce module et toutes ses questions ?')) {
      return;
    }

    try {
      await deleteTrainingModule(moduleId);
      toast.success('Module supprimé');
      await loadModules();
      setSelectedModule(null);
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Erreur lors de la suppression du module');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) {
      return;
    }

    try {
      await deleteQuestion(questionId);
      toast.success('Question supprimée');
      if (selectedModule) {
        await loadQuestions(selectedModule.id);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await Promise.all(
        modules.map(async (module) => {
          const { data: questions } = await supabase
            .from('training_questions')
            .select('*')
            .eq('module_id', module.id);
          
          return {
            ...module,
            questions: questions || [],
          };
        })
      );

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-modules-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export réussi');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!Array.isArray(importData)) {
        throw new Error('Format de fichier invalide');
      }

      // Delete existing data
      await supabase.from('training_questions').delete().neq('id', '0');
      await supabase.from('training_modules').delete().neq('id', '0');

      // Import modules and questions
      for (const moduleData of importData) {
        const { questions, ...moduleInfo } = moduleData;
        
        // Utiliser l'ID existant du module
        const { error: moduleError } = await supabase
          .from('training_modules')
          .upsert({
            ...moduleInfo,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (moduleError) throw moduleError;

        if (questions && questions.length > 0) {
          const questionsToUpsert = questions.map((q: any) => ({
            ...q, // Garder l'ID existant et toutes les autres propriétés
            module_id: moduleInfo.id,
            updated_at: new Date().toISOString(),
          }));

          const { error: questionsError } = await supabase
            .from('training_questions')
            .upsert(questionsToUpsert, {
              onConflict: 'id'
            });

          if (questionsError) throw questionsError;
        }
      }

      toast.success('Import réussi');
      await loadModules();
      event.target.value = '';
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('Erreur lors de l\'import');
    } finally {
      setImporting(false);
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Gestion des modules d'entraînement</h1>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-json"
              disabled={importing}
            />
            <label
              htmlFor="import-json"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>{importing ? "Import en cours..." : "Importer"}</span>
            </label>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Exporter</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Modules</h2>
              <button
                onClick={() => {
                  setEditingModule(null);
                  setShowModuleForm(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau module</span>
              </button>
            </div>

            <ModuleList
              modules={modules}
              onEdit={handleEditModule}
              onDelete={handleDeleteModule}
              onManageQuestions={handleManageQuestions}
              selectedModuleId={selectedModule?.id}
            />
          </div>

          {selectedModule && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">
                  Questions du module : {selectedModule.title}
                </h2>
                <button
                  onClick={() => {
                    setEditingQuestion(null);
                    setShowQuestionForm(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouvelle question</span>
                </button>
              </div>

              <QuestionList
                questions={questions}
                onEdit={setEditingQuestion}
                onDelete={handleDeleteQuestion}
              />
            </div>
          )}
        </div>

        {showModuleForm && (
          <ModuleForm
            module={editingModule}
            onClose={() => setShowModuleForm(false)}
            onSuccess={() => {
              setShowModuleForm(false);
              loadModules();
            }}
          />
        )}

        {showQuestionForm && selectedModule && (
          <QuestionForm
            question={editingQuestion}
            moduleId={selectedModule.id}
            onClose={() => setShowQuestionForm(false)}
            onSuccess={() => {
              setShowQuestionForm(false);
              loadQuestions(selectedModule.id);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TrainingAdmin;