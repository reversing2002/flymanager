import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentProgressions, getProgressionTemplates, createStudentProgression } from '../../lib/queries/progression';
import StudentProgressionView from './StudentProgressionView';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function ProgressionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Rediriger les instructeurs vers la page de progression des élèves
  React.useEffect(() => {
    if (user?.role === 'INSTRUCTOR') {
      navigate('/progression/students');
    }
  }, [user, navigate]);

  const { data: progressions, isLoading: isLoadingProgressions } = useQuery({
    queryKey: ['studentProgressions', user?.id],
    queryFn: () => getStudentProgressions(user!.id),
    enabled: !!user && user.role === 'PILOT',
  });

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['progressionTemplates'],
    queryFn: getProgressionTemplates,
    enabled: !!user && user.role === 'PILOT',
  });

  const handleCreateProgression = async (templateId: string) => {
    try {
      if (!user) return;
      
      await createStudentProgression({
        student_id: user.id,
        template_id: templateId,
        start_date: new Date().toISOString(),
      });
      
      toast.success('Formation commencée avec succès');
      queryClient.invalidateQueries(['studentProgressions']);
    } catch (error) {
      console.error('Erreur lors de la création de la progression:', error);
      toast.error('Une erreur est survenue lors de la création de la progression');
    }
  };

  if (isLoadingProgressions || isLoadingTemplates) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-gray-500">
        Veuillez vous connecter pour accéder à vos progressions.
      </div>
    );
  }

  const hasProgressions = progressions && progressions.length > 0;
  const hasTemplates = templates && templates.length > 0;

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Ma progression</h1>
        <p className="mt-2 text-slate-600">
          Suivez votre progression dans vos formations
        </p>
      </div>

      {!hasProgressions && hasTemplates && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-slate-900">
            Commencer une formation
          </h3>
          <p className="mt-2 text-slate-600 mb-6">
            Choisissez une formation pour commencer votre progression
          </p>
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleCreateProgression(template.id)}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
              >
                {template.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasProgressions && (
        <StudentProgressionView
          progressions={progressions}
          isLoading={isLoadingProgressions}
          canValidate={false}
        />
      )}
    </div>
  );
}
