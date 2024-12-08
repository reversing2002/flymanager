import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Award, Book, Clock, Shuffle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { TrainingModule, UserProgress } from '../../types/training';
import { getTrainingModules, getUserProgress, updateAllProgressPercentages } from '../../lib/queries/training';
import TrainingModuleCard from './TrainingModuleCard';
import TrainingHistory from './TrainingHistory';
import QuizMix from './QuizMix';

const TrainingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'modules' | 'history' | 'quiz'>('modules');

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Mettre à jour tous les pourcentages
        await updateAllProgressPercentages(user.id);
        
        // Récupérer les modules et la progression
        const [modulesData, progressData] = await Promise.all([
          getTrainingModules(),
          getUserProgress(user.id)
        ]);

        setModules(modulesData);
        setProgress(progressData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getModuleProgress = (moduleId: string): number => {
    const moduleProgress = progress.find(p => p.module_id === moduleId);
    return moduleProgress?.progress || 0;
  };

  const getTotalPoints = (): number => {
    return progress.reduce((total, p) => total + (p.points_earned || 0), 0);
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

      <div className="mb-6 border-b border-slate-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('modules')}
            className={`py-2 px-1 -mb-px text-sm font-medium ${
              activeTab === 'modules'
                ? 'text-sky-600 border-b-2 border-sky-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Book className="w-4 h-4 inline-block mr-2" />
            Modules
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`py-2 px-1 -mb-px text-sm font-medium ${
              activeTab === 'quiz'
                ? 'text-sky-600 border-b-2 border-sky-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shuffle className="w-4 h-4 inline-block mr-2" />
            Quiz Mix
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 -mb-px text-sm font-medium ${
              activeTab === 'history'
                ? 'text-sky-600 border-b-2 border-sky-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 inline-block mr-2" />
            Historique
          </button>
        </div>
      </div>

      {activeTab === 'modules' ? (
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
      ) : activeTab === 'quiz' ? (
        <QuizMix />
      ) : (
        <TrainingHistory />
      )}
    </div>
  );
};

export default TrainingPage;