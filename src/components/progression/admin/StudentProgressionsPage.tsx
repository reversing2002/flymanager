import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClubStudents } from '../../../lib/queries/users';
import { getProgressionTemplates, createStudentProgression, getStudentProgressions } from '../../../lib/queries/progression';
import { PlusCircle, Search, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StudentProgressionView from '../StudentProgressionView';
import { useUser } from '../../../hooks/useUser';
import { hasAnyGroup } from "../../../lib/permissions";

export default function StudentProgressionsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['clubStudents', user?.id],
    queryFn: () => getClubStudents(user!.id),
    enabled: !!user,
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['progressionTemplates'],
    queryFn: () => getProgressionTemplates(),
  });

  const { data: studentProgressions, isLoading: loadingProgressions, error: progressionsError } = useQuery({
    queryKey: ['studentProgressions', selectedStudent],
    queryFn: () => selectedStudent ? getStudentProgressions(selectedStudent) : Promise.resolve([]),
    enabled: !!selectedStudent,
  });

  const students = users?.filter(user => 
    search === '' || 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateProgression = async (templateId: string) => {
    if (!selectedStudent) return;

    try {
      await createStudentProgression({
        student_id: selectedStudent,
        template_id: templateId,
        start_date: new Date().toISOString()
      });
      await queryClient.invalidateQueries(['studentProgressions', selectedStudent]);
      toast.success('Formation assignée avec succès');
      setShowTemplateSelect(false);
    } catch (error) {
      console.error('Erreur lors de l\'assignation de la formation:', error);
      toast.error('Erreur lors de l\'assignation de la formation');
    }
  };

  const canValidate = hasAnyGroup(user, ['INSTRUCTOR', 'ADMIN']);

  if (loadingUsers || loadingTemplates) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Progression des élèves
        </h1>
        <p className="mt-2 text-slate-600">
          Gérez les formations de vos élèves
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un élève..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {students?.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student.id)}
                  className={`w-full p-4 text-left hover:bg-slate-50 ${
                    selectedStudent === student.id ? 'bg-sky-50' : ''
                  }`}
                >
                  <div className="font-medium text-slate-900">
                    {student.first_name} {student.last_name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {loadingProgressions ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
            </div>
          ) : selectedStudent ? (
            <div className="space-y-6">
              {canValidate && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowTemplateSelect(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                  >
                    <PlusCircle className="h-5 w-5" />
                    Assigner une formation
                  </button>
                </div>
              )}

              {showTemplateSelect && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <select
                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                    onChange={(e) => handleCreateProgression(e.target.value)}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Sélectionner une formation
                    </option>
                    {templates?.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {progressionsError ? (
                <div className="bg-white rounded-lg border border-slate-200 p-8">
                  <div className="flex items-center gap-3 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <p>Erreur lors du chargement des progressions</p>
                  </div>
                </div>
              ) : !studentProgressions || studentProgressions.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                  <p className="text-slate-600">
                    Aucune formation assignée à cet élève
                  </p>
                </div>
              ) : (
                <StudentProgressionView
                  progressions={studentProgressions}
                  canValidate={canValidate}
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-600">
                Sélectionnez un élève pour voir sa progression
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
