import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProgressionTemplates, getProgressionTemplateWithModules } from '../../../lib/queries/progression';
import { PlusCircle, Edit2, Trash2 } from 'lucide-react';
import ProgressionTemplateForm from '../ProgressionTemplateForm';
import { toast } from 'react-hot-toast';

export default function ProgressionAdminPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['progressionTemplates'],
    queryFn: getProgressionTemplates,
  });

  const { data: template, isLoading: loadingTemplate } = useQuery({
    queryKey: ['progressionTemplate', selectedTemplate],
    queryFn: () => getProgressionTemplateWithModules(selectedTemplate!),
    enabled: !!selectedTemplate,
  });

  const handleSuccess = () => {
    queryClient.invalidateQueries(['progressionTemplates']);
    setShowForm(false);
    setSelectedTemplate(null);
  };

  if (loadingTemplates) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Gestion des formations
            </h1>
            <p className="mt-2 text-slate-600">
              Créez et gérez les modèles de progression pour vos élèves
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedTemplate(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
          >
            <PlusCircle className="h-5 w-5" />
            Nouvelle formation
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {template.title}
                </h3>
                <p className="text-sm text-slate-500">{template.category}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(template.id);
                    setShowForm(true);
                  }}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {template.description && (
              <p className="text-slate-600 text-sm mb-4">{template.description}</p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <ProgressionTemplateForm
          template={template}
          onClose={() => {
            setShowForm(false);
            setSelectedTemplate(null);
          }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
