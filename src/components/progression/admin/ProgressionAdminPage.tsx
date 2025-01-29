import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  getProgressionTemplates, 
  getProgressionTemplateWithModules, 
  createProgressionTemplate, 
  createProgressionModule, 
  createProgressionSkill, 
  updateProgressionTemplate, 
  updateProgressionModule, 
  updateProgressionSkill, 
  deleteProgressionModule, 
  deleteProgressionSkill,
  deleteProgressionTemplate
} from '../../../lib/queries/progression';
import { PlusCircle, Edit2, Download, Upload, FileJson, Trash2 } from 'lucide-react';
import ProgressionTemplateForm from '../ProgressionTemplateForm';
import { toast } from 'react-hot-toast';
import JsonEditorModal from './JsonEditorModal';
import { useUser } from '../../../hooks/useUser';
import { hasAnyGroup } from '../../../lib/permissions';

export default function ProgressionAdminPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonEditorMode, setJsonEditorMode] = useState<'view' | 'import'>('view');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user } = useUser();

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

  const handleImportJson = async (data: any) => {
    try {
      // Validate the structure
      if (!data.title || !data.category || !Array.isArray(data.modules)) {
        throw new Error('Structure JSON invalide');
      }

      let templateId: string;

      // Update or create the template
      if (data.id) {
        try {
          // Vérifier si le template existe
          await getProgressionTemplateWithModules(data.id);
          
          await updateProgressionTemplate(data.id, {
            title: data.title,
            description: data.description || null,
            category: data.category,
          });
          templateId = data.id;
          
          // Get existing modules to track which ones to delete
          const existingTemplate = await getProgressionTemplateWithModules(data.id);
          const updatedModuleIds = data.modules.map((m: any) => m.id).filter(Boolean);
          const modulesToDelete = existingTemplate.modules
            .filter(m => !updatedModuleIds.includes(m.id))
            .map(m => m.id);

          // Delete modules that are no longer present
          for (const moduleId of modulesToDelete) {
            await deleteProgressionModule(moduleId);
          }
        } catch (error) {
          console.warn('Template not found, creating new one');
          const newTemplate = await createProgressionTemplate({
            title: data.title,
            description: data.description || null,
            category: data.category,
          });
          templateId = newTemplate.id;
        }
      } else {
        // Create new template
        const newTemplate = await createProgressionTemplate({
          title: data.title,
          description: data.description || null,
          category: data.category,
        });
        templateId = newTemplate.id;
      }

      // Create or update modules and their skills
      for (const [moduleIndex, module] of data.modules.entries()) {
        if (!module.title) continue;

        let moduleId: string;

        if (module.id) {
          try {
            // Verify if module exists
            const existingTemplate = await getProgressionTemplateWithModules(templateId);
            const moduleExists = existingTemplate.modules.some(m => m.id === module.id);
            
            if (moduleExists) {
              // Update existing module
              await updateProgressionModule(module.id, {
                title: module.title,
                description: module.description || null,
                code: module.code || '',
                order_index: moduleIndex,
              });
              moduleId = module.id;

              // Get existing skills to track which ones to delete
              const currentModule = existingTemplate.modules.find(m => m.id === moduleId);
              if (currentModule) {
                const updatedSkillIds = module.skills.map((s: any) => s.id).filter(Boolean);
                const skillsToDelete = currentModule.skills
                  .filter(s => !updatedSkillIds.includes(s.id))
                  .map(s => s.id);

                // Delete skills that are no longer present
                for (const skillId of skillsToDelete) {
                  await deleteProgressionSkill(skillId);
                }
              }
            } else {
              throw new Error('Module not found');
            }
          } catch (error) {
            // Create new module if not found
            const newModule = await createProgressionModule({
              template_id: templateId,
              title: module.title,
              description: module.description || null,
              code: module.code || '',
              order_index: moduleIndex,
            });
            moduleId = newModule.id;
          }
        } else {
          // Create new module
          const newModule = await createProgressionModule({
            template_id: templateId,
            title: module.title,
            description: module.description || null,
            code: module.code || '',
            order_index: moduleIndex,
          });
          moduleId = newModule.id;
        }

        // Create or update skills for this module
        if (Array.isArray(module.skills)) {
          for (const [skillIndex, skill] of module.skills.entries()) {
            if (!skill.title) continue;

            if (skill.id) {
              try {
                // Verify if skill exists
                const existingTemplate = await getProgressionTemplateWithModules(templateId);
                const currentModule = existingTemplate.modules.find(m => m.id === moduleId);
                const skillExists = currentModule?.skills.some(s => s.id === skill.id);

                if (skillExists) {
                  // Update existing skill
                  await updateProgressionSkill(skill.id, {
                    title: skill.title,
                    description: skill.description || null,
                    code: skill.code || '',
                    order_index: skillIndex,
                  });
                } else {
                  throw new Error('Skill not found');
                }
              } catch (error) {
                // Create new skill if not found
                await createProgressionSkill({
                  module_id: moduleId,
                  title: skill.title,
                  description: skill.description || null,
                  code: skill.code || '',
                  order_index: skillIndex,
                });
              }
            } else {
              // Create new skill
              await createProgressionSkill({
                module_id: moduleId,
                title: skill.title,
                description: skill.description || null,
                code: skill.code || '',
                order_index: skillIndex,
              });
            }
          }
        }
      }

      toast.success(data.id ? 'Module de formation mis à jour avec succès' : 'Module de formation importé avec succès');
      queryClient.invalidateQueries(['progressionTemplates']);
    } catch (error) {
      console.error('Error importing template:', error);
      toast.error('Erreur lors de l\'importation');
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteProgressionTemplate(templateId);
      toast.success('Formation supprimée avec succès');
      queryClient.invalidateQueries(['progressionTemplates']);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression');
    }
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
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = async (e) => {
                    try {
                      const content = e.target?.result as string;
                      // Validate JSON format
                      JSON.parse(content);
                      setJsonContent(content);
                      setJsonEditorMode('import');
                      setShowJsonEditor(true);
                    } catch (error) {
                      toast.error('Format JSON invalide');
                    }
                  };
                  reader.readAsText(file);
                }
              }}
            />
            <button
              onClick={() => {
                setJsonContent(JSON.stringify({
                  title: "",
                  description: "",
                  category: "",
                  modules: [
                    {
                      title: "",
                      description: "",
                      code: "",
                      skills: [
                        {
                          title: "",
                          description: "",
                          code: ""
                        }
                      ]
                    }
                  ]
                }, null, 2));
                setJsonEditorMode('import');
                setShowJsonEditor(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Importer JSON
            </button>
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
                <button
                  onClick={async () => {
                    try {
                      const templateData = await getProgressionTemplateWithModules(template.id);
                      const cleanTemplate = {
                        id: templateData.id,
                        title: templateData.title,
                        description: templateData.description,
                        category: templateData.category,
                        modules: templateData.modules.map(module => ({
                          id: module.id,
                          title: module.title,
                          description: module.description,
                          code: module.code,
                          skills: module.skills.map(skill => ({
                            id: skill.id,
                            title: skill.title,
                            description: skill.description,
                            code: skill.code
                          }))
                        }))
                      };
                      const jsonStr = JSON.stringify(cleanTemplate, null, 2);
                      setJsonContent(jsonStr);
                      setJsonEditorMode('view');
                      setShowJsonEditor(true);
                    } catch (error) {
                      toast.error('Erreur lors du chargement des données');
                    }
                  }}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FileJson className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    const templateData = templates?.find(t => t.id === template.id);
                    if (templateData) {
                      const jsonStr = JSON.stringify(templateData, null, 2);
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${templateData.title.toLowerCase().replace(/\s+/g, '-')}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                </button>
                {hasAnyGroup(user, ['ADMIN']) && (
                  <button
                    onClick={() => setShowDeleteConfirm(template.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {template.description && (
              <p className="text-slate-600 text-sm mb-4">{template.description}</p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <>
          {loadingTemplate ? (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto" />
                <p className="text-slate-600 mt-2">Chargement du template...</p>
              </div>
            </div>
          ) : (
            <ProgressionTemplateForm
              template={template}
              onClose={() => {
                setShowForm(false);
                setSelectedTemplate(null);
              }}
              onSuccess={handleSuccess}
            />
          )}
        </>
      )}

      {showJsonEditor && (
        <JsonEditorModal
          isOpen={showJsonEditor}
          onClose={() => {
            setShowJsonEditor(false);
            setJsonContent('');
          }}
          value={jsonContent}
          readOnly={jsonEditorMode === 'view'}
          mode={jsonEditorMode}
          onImport={handleImportJson}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Confirmer la suppression
            </h3>
            <p className="text-slate-600 mb-6">
              Êtes-vous sûr de vouloir supprimer cette formation ? Cette action supprimera également toutes les progressions des élèves associées à cette formation.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
