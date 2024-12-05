import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { getStudentProgressions, getProgressionTemplates, createStudentProgression } from '../../lib/queries/progression';
import StudentProgressionView from './StudentProgressionView';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { hasAnyGroup } from "../../lib/permissions";
import { GraduationCap, BookOpen, Loader2 } from 'lucide-react';

export default function ProgressionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Rediriger les instructeurs vers la page de progression des élèves
  React.useEffect(() => {
    if (hasAnyGroup(user, ['INSTRUCTOR'])) {
      navigate('/progression/students');
    }
  }, [user, navigate]);

  const { data: progressions, isLoading: isLoadingProgressions } = useQuery({
    queryKey: ['studentProgressions', user?.id],
    queryFn: () => getStudentProgressions(user!.id),
    enabled: !!user && hasAnyGroup(user, ['PILOT']),
  });

  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['progressionTemplates'],
    queryFn: getProgressionTemplates,
    enabled: !!user && hasAnyGroup(user, ['PILOT']),
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
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
        <p className="mt-4 text-sm text-slate-600">Chargement de vos formations...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] px-4">
        <div className="text-center max-w-md">
          <GraduationCap className="mx-auto h-12 w-12 text-slate-400" />
          <h2 className="mt-4 text-lg font-medium text-slate-900">Connexion requise</h2>
          <p className="mt-2 text-sm text-slate-600">
            Veuillez vous connecter pour accéder à vos progressions.
          </p>
        </div>
      </div>
    );
  }

  const hasProgressions = progressions && progressions.length > 0;
  const hasTemplates = templates && templates.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-6 w-6 text-sky-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Ma progression</h1>
          </div>
          <p className="text-slate-600">
            Suivez votre progression dans vos formations
          </p>
        </div>

        {!hasProgressions && hasTemplates && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-sky-600" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">
                Commencer une formation
              </h3>
              <p className="mt-2 text-slate-600 mb-8">
                Choisissez une formation pour commencer votre progression
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleCreateProgression(template.id)}
                    className="group relative flex flex-col items-center p-6 bg-slate-50 hover:bg-sky-50 rounded-lg border-2 border-slate-200 hover:border-sky-200 transition-colors"
                  >
                    <div className="font-medium text-slate-900 group-hover:text-sky-700 text-center">
                      {template.title}
                    </div>
                    {template.description && (
                      <p className="mt-2 text-sm text-slate-500 text-center">
                        {template.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
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
    </div>
  );
}
