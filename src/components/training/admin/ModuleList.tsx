import React from 'react';
import { Book, Award, Clock, Pencil, Plus } from 'lucide-react';
import type { TrainingModule } from '../../../types/training';

interface ModuleListProps {
  modules: TrainingModule[];
  onEdit: (module: TrainingModule) => void;
  onManageQuestions: (module: TrainingModule) => void;
  onAdd: () => void;
}

const ModuleList: React.FC<ModuleListProps> = ({
  modules,
  onEdit,
  onManageQuestions,
  onAdd,
}) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'bg-emerald-100 text-emerald-800';
      case 'INTERMEDIATE':
        return 'bg-sky-100 text-sky-800';
      case 'ADVANCED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {modules.map(module => (
        <div key={module.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {module.title}
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  {module.description}
                </p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(module.level)}`}>
                {module.level}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-600">
                  <Book className="h-4 w-4 mr-2" />
                  <span>Catégorie</span>
                </div>
                <span className="text-slate-700">{module.category}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-slate-600">
                  <Award className="h-4 w-4 mr-2" />
                  <span>Points</span>
                </div>
                <span className="text-slate-700 font-medium">{module.points}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-between">
              <button
                onClick={() => onEdit(module)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <Pencil className="h-4 w-4" />
                <span>Modifier</span>
              </button>
              <button
                onClick={() => onManageQuestions(module)}
                className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700"
              >
                <Plus className="h-4 w-4" />
                <span>Questions</span>
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={onAdd}
        className="bg-white rounded-xl shadow-sm p-6 border-2 border-dashed border-slate-200 hover:border-slate-300 transition-colors flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-slate-900"
      >
        <Plus className="h-8 w-8" />
        <span className="font-medium">Nouveau module</span>
      </button>
    </div>
  );
};

export default ModuleList;