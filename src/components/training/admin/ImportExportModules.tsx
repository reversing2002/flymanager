import React, { useState } from "react";
import { Upload, Download, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../../lib/supabase";
import { v4 as uuidv4 } from "uuid";

interface ImportExportModulesProps {
  onSuccess: () => void;
}

const ImportExportModules: React.FC<ImportExportModulesProps> = ({
  onSuccess,
}) => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      // Récupérer tous les modules et leurs questions
      const { data: modules, error: modulesError } = await supabase
        .from("training_modules")
        .select("*")
        .order("title");

      if (modulesError) throw modulesError;

      const exportData = await Promise.all(
        modules.map(async (module) => {
          const { data: questions, error: questionsError } = await supabase
            .from("training_questions")
            .select("*")
            .eq("module_id", module.id)
            .order("created_at");

          if (questionsError) throw questionsError;

          return {
            ...module,
            questions: questions || [],
          };
        })
      );

      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `training-modules-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export réussi");
    } catch (err) {
      console.error("Error exporting data:", err);
      toast.error("Erreur lors de l'export");
      setError("Erreur lors de l'export des données");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Vérifier le format des données
      if (!Array.isArray(importData)) {
        throw new Error("Format de fichier invalide");
      }

      // Pour chaque module dans les données importées
      for (const moduleData of importData) {
        const { questions, id: oldModuleId, ...moduleInfo } = moduleData;

        // Vérifier si un module avec le même titre existe déjà
        const { data: existingModule } = await supabase
          .from("training_modules")
          .select("id")
          .eq("title", moduleInfo.title)
          .single();

        let moduleId;

        if (existingModule) {
          // Mettre à jour le module existant
          const { error: updateError } = await supabase
            .from("training_modules")
            .update({
              ...moduleInfo,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingModule.id);

          if (updateError) throw updateError;
          moduleId = existingModule.id;

          // Supprimer les anciennes questions du module
          const { error: deleteError } = await supabase
            .from("training_questions")
            .delete()
            .eq("module_id", moduleId);

          if (deleteError) throw deleteError;
        } else {
          // Créer un nouveau module
          moduleId = uuidv4();
          const { error: insertError } = await supabase
            .from("training_modules")
            .insert([
              {
                id: moduleId,
                ...moduleInfo,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]);

          if (insertError) throw insertError;
        }

        // Créer les questions pour ce module
        if (questions && questions.length > 0) {
          const questionsToInsert = questions.map((q: any) => ({
            id: uuidv4(),
            module_id: moduleId,
            question: q.question,
            choices: q.choices,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            points: q.points,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          const { error: questionsError } = await supabase
            .from("training_questions")
            .insert(questionsToInsert);

          if (questionsError) throw questionsError;
        }
      }

      toast.success("Import réussi");
      onSuccess();
      event.target.value = "";
    } catch (err) {
      console.error("Error importing data:", err);
      toast.error("Erreur lors de l'import");
      setError("Erreur lors de l'import des données");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

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
  );
};

export default ImportExportModules;
