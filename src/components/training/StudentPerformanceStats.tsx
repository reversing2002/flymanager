import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudentPerformanceStats } from '../../lib/queries/training';
import { CheckCircle2, AlertTriangle, HelpCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  userId: string;
}

const StudentPerformanceStats: React.FC<Props> = ({ userId }) => {
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['studentPerformance', userId],
    queryFn: () => getStudentPerformanceStats(userId)
  });

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  if (isLoading) {
    return <div className="animate-pulse">Chargement des statistiques...</div>;
  }

  if (!stats || Object.keys(stats).length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Aucune donnée disponible pour cet élève
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'strong':
        return <CheckCircle2 className="text-green-500" />;
      case 'weak':
        return <AlertTriangle className="text-red-500" />;
      default:
        return <HelpCircle className="text-yellow-500" />;
    }
  };

  const getStatusColor = (successRate: number) => {
    if (successRate >= 80) return 'bg-green-500';
    if (successRate <= 50) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  return (
    <div className="space-y-4">
      {Object.entries(stats).map(([category, data]: [string, any]) => (
        <div key={category} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex items-center space-x-4">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(data.successRate)}`} />
              <h3 className="font-medium">{category}</h3>
              <span className="text-sm text-gray-500">
                {data.successRate}% de réussite
              </span>
            </div>
            {expandedCategories.includes(category) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>

          {expandedCategories.includes(category) && (
            <div className="p-4 space-y-4">
              {Object.entries(data.modules).map(([moduleId, module]: [string, any]) => (
                <div key={moduleId} className="pl-6 border-l-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(module.status)}
                      <h4 className="font-medium">{module.title}</h4>
                    </div>
                    <span className="text-sm text-gray-500">
                      {module.successRate}% ({module.correct}/{module.total})
                    </span>
                  </div>

                  {/* Dernières tentatives */}
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-1">Dernières tentatives :</p>
                    <div className="flex space-x-1">
                      {module.recentAttempts.map((attempt: any, index: number) => (
                        <div
                          key={index}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
                            attempt.isCorrect ? 'bg-green-500' : 'bg-red-500'
                          }`}
                          title={format(new Date(attempt.date), 'PPP', { locale: fr })}
                        >
                          {attempt.isCorrect ? '✓' : '✗'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StudentPerformanceStats;
