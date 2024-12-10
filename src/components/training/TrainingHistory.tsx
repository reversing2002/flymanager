import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTrainingHistory } from '@/lib/queries/training';
import { CheckCircle2, XCircle } from 'lucide-react';

const TrainingHistory = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['trainingHistory', user?.id],
    queryFn: () => getTrainingHistory(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-100 h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Historique des réponses</h2>
      <div className="space-y-4">
        {history.map((entry, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-4"
          >
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold">{entry.module.title}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  entry.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {entry.is_correct ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {new Date(entry.created_at).toLocaleString()}
              </p>
              <p className="font-medium">{entry.question.question}</p>
              <div className="space-y-1">
                {entry.question.choices.map((choice, choiceIndex) => (
                  <div
                    key={choiceIndex}
                    className={`p-2 rounded ${
                      choiceIndex === entry.answer_index
                        ? entry.is_correct
                          ? 'bg-green-100'
                          : 'bg-red-100'
                        : choiceIndex === entry.question.correctAnswer
                        ? 'bg-green-100'
                        : 'bg-gray-50'
                    }`}
                  >
                    {choice}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Points gagnés : {entry.points_earned}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrainingHistory;
