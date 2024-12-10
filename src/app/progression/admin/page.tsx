import React, { useState } from 'react';
import ProgressionTemplateList from '../../../components/progression/ProgressionTemplateList';
import ProgressionTemplateForm from '../../../components/progression/ProgressionTemplateForm';
import { useQuery } from '@tanstack/react-query';
import { getProgressionTemplateWithModules } from '../../../lib/queries/progression';

export default function ProgressionAdminPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: template } = useQuery({
    queryKey: ['progressionTemplate', selectedTemplate],
    queryFn: () => getProgressionTemplateWithModules(selectedTemplate!),
    enabled: !!selectedTemplate,
  });

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Gestion des formations
        </h1>
        <p className="mt-2 text-slate-600">
          Créez et gérez les modèles de progression pour vos élèves
        </p>
      </div>

      <ProgressionTemplateList
        onSelectTemplate={(template) => setSelectedTemplate(template.id)}
        onCreateTemplate={() => setShowForm(true)}
        showCreateButton
      />

      {showForm && (
        <ProgressionTemplateForm
          template={template}
          onClose={() => {
            setShowForm(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}
