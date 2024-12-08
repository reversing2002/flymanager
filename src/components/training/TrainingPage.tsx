import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { TrainingModule, UserProgress } from '../../types/training';
import { getTrainingModules, getUserProgress } from '../../lib/queries/training';
import TrainingModuleCard from './TrainingModuleCard';

const TrainingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [modulesData, progressData] = await Promise.all([
          getTrainingModules(),
          user ? getUserProgress(user.id) : Promise.resolve([])
        ]);

        setModules(modulesData);
        setProgress(progressData);
      } catch (error) {
        console.error('Error loading training data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const getModuleProgress = (moduleId: string): number => {
    const moduleProgress = progress.find(p => p.moduleId === moduleId);
    return moduleProgress?.progress || 0;
  };

  const getTotalPoints = (): number => {
    return progress.reduce((total, p) => total + (p.pointsEarned || 0), 0);
  };

  const handleModuleClick = (moduleId: string) => {
    navigate(`/training/${moduleId}`);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Formation</h1>
          <p className="text-slate-600">Améliorez vos connaissances théoriques</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
            <Book className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-xs text-slate-600">Modules</p>
              <p className="text-sm font-medium">{modules.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200">
            <Award className="h-5 w-5 text-slate-600" />
            <div>
              <p className="text-xs text-slate-600">Points</p>
              <p className="text-sm font-medium">{getTotalPoints()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(module => (
          <TrainingModuleCard
            key={module.id}
            module={module}
            progress={getModuleProgress(module.id)}
            onClick={() => handleModuleClick(module.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default TrainingPage;