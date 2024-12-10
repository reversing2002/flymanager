import React from 'react';
import { getStudentProgressions } from '../../lib/queries/progression';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '../../hooks/useUser';
import { PlusCircle } from 'lucide-react';
import StudentProgressionView from '../../components/progression/StudentProgressionView';

export default function ProgressionPage() {
  const { user } = useUser();
  const { data: progressions, isLoading } = useQuery({
    queryKey: ['studentProgressions', user?.id],
    queryFn: () => getStudentProgressions(user!.id),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Ma progression</h1>
        <p className="mt-2 text-slate-600">
          Suivez votre progression dans vos formations
        </p>
      </div>

      {progressions?.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-slate-900">
            Aucune formation en cours
          </h3>
          <p className="mt-2 text-slate-600">
            Contactez votre instructeur pour commencer une formation
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {progressions?.map((progression) => (
            <StudentProgressionView
              key={progression.id}
              progression={progression}
            />
          ))}
        </div>
      )}
    </div>
  );
}
