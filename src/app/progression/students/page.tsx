import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../../../lib/queries/users';
import { getProgressionTemplates, createStudentProgression } from '../../../lib/queries/progression';
import { PlusCircle, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { hasAnyGroup } from "../../../lib/permissions";

export default function StudentProgressionsPage() {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);

  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['progressionTemplates'],
    queryFn: () => getProgressionTemplates(),
  });

  const students = users?.filter(user => 
    hasAnyGroup(user, ['STUDENT']) &&
    (search === '' || 
     `${user.firstName} ${user.lastName}`.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateProgression = async (templateId: string) => {
    if (!selectedStudent) return;

    try {
      await createStudentProgression({
        studentId: selectedStudent,
        templateId,
      });
      toast.success('Formation assignée avec succès');
      setSelectedStudent(null);
      setShowTemplateSelect(false);
    } catch (error) {
      toast.error('Erreur lors de l\'assignation de la formation');
    }
  };

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
            <div
              key={student.id}
              className="p-4 flex items-center justify-between hover:bg-slate-50"
            >
              <div>
                <div className="font-medium text-slate-900">
                  {student.firstName} {student.lastName}
                </div>
                <div className="text-sm text-slate-500">{student.email}</div>
              </div>

              {selectedStudent === student.id && showTemplateSelect ? (
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
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
                  <button
                    onClick={() => {
                      setSelectedStudent(null);
                      setShowTemplateSelect(false);
                    }}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedStudent(student.id);
                    setShowTemplateSelect(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-sky-600 hover:bg-sky-50 rounded-lg"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Assigner une formation</span>
                </button>
              )}
            </div>
          ))}

          {students?.length === 0 && (
            <div className="p-4 text-center text-slate-600">
              Aucun élève trouvé
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
