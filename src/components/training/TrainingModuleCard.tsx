import React from 'react';
import { Book, Award, Clock } from 'lucide-react';
import type { TrainingModule } from '../../types/training';

interface TrainingModuleCardProps {
  module: TrainingModule;
  progress?: number;
  onClick: () => void;
}

const TrainingModuleCard: React.FC<TrainingModuleCardProps> = ({
  module,
  progress = 0,
  onClick,
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
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer hover:bg-slate-50"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{module.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{module.description}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(module.level)}`}>
            {module.level}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-slate-600">
              <Clock className="h-4 w-4 mr-2" />
              <span>Progression</span>
            </div>
            <div className="flex items-center">
              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="ml-2 text-slate-700 font-medium">{progress}%</span>
            </div>
          </div>

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
      </div>
    </div>
  );
};

export default TrainingModuleCard;