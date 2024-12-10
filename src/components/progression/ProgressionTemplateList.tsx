import React from 'react';
import { PlusCircle } from 'lucide-react';
import type { ProgressionTemplate } from '../../types/progression';
import { getProgressionTemplates } from '../../lib/queries/progression';
import { useQuery } from '@tanstack/react-query';

interface ProgressionTemplateListProps {
  onSelectTemplate: (template: ProgressionTemplate) => void;
  onCreateTemplate?: () => void;
  showCreateButton?: boolean;
}

const ProgressionTemplateList: React.FC<ProgressionTemplateListProps> = ({
  onSelectTemplate,
  onCreateTemplate,
  showCreateButton = false,
}) => {
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['progressionTemplates'],
    queryFn: getProgressionTemplates,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        Une erreur est survenue lors du chargement des modèles de progression
      </div>
    );
  }

  // Grouper les templates par catégorie
  const templatesByCategory = templates?.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, ProgressionTemplate[]>) || {};

  return (
    <div className="space-y-6">
      {showCreateButton && onCreateTemplate && (
        <button
          onClick={onCreateTemplate}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sky-600 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Créer un nouveau modèle de progression</span>
        </button>
      )}

      {Object.entries(templatesByCategory).map(([category, templates]) => (
        <div key={category}>
          <h3 className="font-semibold text-lg text-slate-900 mb-3">
            {category}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="text-left p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                <h4 className="font-medium text-slate-900">
                  {template.title}
                </h4>
                {template.description && (
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {templates?.length === 0 && (
        <div className="text-center py-12 text-slate-600">
          Aucun modèle de progression n'a été créé
        </div>
      )}
    </div>
  );
};

export default ProgressionTemplateList;
