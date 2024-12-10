import React, { useState } from 'react';
import { X, GripVertical, PlusCircle, Trash2 } from 'lucide-react';
import type {
  ProgressionTemplate,
  ProgressionModule,
  ProgressionSkill,
  CreateProgressionTemplate,
  CreateProgressionModule,
  CreateProgressionSkill,
} from '../../types/progression';
import {
  createProgressionTemplate,
  updateProgressionTemplate,
  createProgressionModule,
  updateProgressionModule,
  deleteProgressionModule,
  createProgressionSkill,
  updateProgressionSkill,
  deleteProgressionSkill,
} from '../../lib/queries/progression';
import { toast } from 'react-hot-toast';

interface ProgressionTemplateFormProps {
  template?: ProgressionTemplate & { modules: (ProgressionModule & { skills: ProgressionSkill[] })[] };
  onClose: () => void;
  onSuccess: () => void;
}

const ProgressionTemplateForm: React.FC<ProgressionTemplateFormProps> = ({
  template,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: template?.title || '',
    description: template?.description || '',
    category: template?.category || '',
    modules: template?.modules || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let templateId = template?.id;

      // Créer ou mettre à jour le template
      if (template) {
        await updateProgressionTemplate(template.id, {
          title: formData.title,
          description: formData.description,
          category: formData.category,
        });
      } else {
        const newTemplate = await createProgressionTemplate({
          title: formData.title,
          description: formData.description,
          category: formData.category,
        });
        templateId = newTemplate.id;
      }

      // Gérer les modules et leurs compétences
      for (const [moduleIndex, module] of formData.modules.entries()) {
        let moduleId = module.id;

        if (moduleId) {
          // Mettre à jour le module existant
          await updateProgressionModule(moduleId, {
            title: module.title,
            description: module.description,
            code: module.code,
            order_index: moduleIndex,
          });
        } else {
          // Créer un nouveau module
          const newModule = await createProgressionModule({
            template_id: templateId!,
            title: module.title,
            description: module.description,
            code: module.code,
            order_index: moduleIndex,
          });
          moduleId = newModule.id;
        }

        // Gérer les compétences du module
        for (const [skillIndex, skill] of module.skills.entries()) {
          if (skill.id) {
            // Mettre à jour la compétence existante
            await updateProgressionSkill(skill.id, {
              title: skill.title,
              description: skill.description,
              code: skill.code,
              order_index: skillIndex,
            });
          } else {
            // Créer une nouvelle compétence
            await createProgressionSkill({
              module_id: moduleId!,
              title: skill.title,
              description: skill.description,
              code: skill.code,
              order_index: skillIndex,
            });
          }
        }
      }

      // Supprimer les modules qui ne sont plus présents
      if (template) {
        const currentModuleIds = formData.modules.map(m => m.id).filter(Boolean);
        const modulesToDelete = template.modules
          .filter(m => !currentModuleIds.includes(m.id))
          .map(m => m.id);

        for (const moduleId of modulesToDelete) {
          await deleteProgressionModule(moduleId);
        }
      }

      toast.success(template ? 'Modèle mis à jour' : 'Modèle créé');
      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const addModule = () => {
    setFormData({
      ...formData,
      modules: [
        ...formData.modules,
        {
          id: '',
          template_id: template?.id || '',
          title: '',
          description: '',
          code: '',
          order_index: formData.modules.length,
          skills: [],
          created_at: '',
          updated_at: '',
        },
      ],
    });
  };

  const addSkill = (moduleIndex: number) => {
    const newModules = [...formData.modules];
    newModules[moduleIndex].skills.push({
      id: '',
      module_id: newModules[moduleIndex].id,
      title: '',
      description: '',
      code: '',
      order_index: newModules[moduleIndex].skills.length,
      created_at: '',
      updated_at: '',
    });
    setFormData({ ...formData, modules: newModules });
  };

  const removeModule = (moduleIndex: number) => {
    const newModules = formData.modules.filter((_, index) => index !== moduleIndex);
    setFormData({ ...formData, modules: newModules });
  };

  const removeSkill = (moduleIndex: number, skillIndex: number) => {
    const newModules = [...formData.modules];
    newModules[moduleIndex].skills = newModules[moduleIndex].skills.filter(
      (_, index) => index !== skillIndex
    );
    setFormData({ ...formData, modules: newModules });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {template ? 'Modifier le modèle' : 'Nouveau modèle de progression'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titre
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Catégorie
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-slate-900">Modules</h3>
              <button
                type="button"
                onClick={addModule}
                className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Ajouter un module</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.modules.map((module, moduleIndex) => (
                <div
                  key={moduleIndex}
                  className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-4"
                >
                  <div className="flex items-start gap-4">
                    <GripVertical className="h-5 w-5 text-slate-400" />
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Titre du module
                        </label>
                        <input
                          type="text"
                          value={module.title}
                          onChange={(e) => {
                            const newModules = [...formData.modules];
                            newModules[moduleIndex].title = e.target.value;
                            setFormData({ ...formData, modules: newModules });
                          }}
                          className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Description du module
                        </label>
                        <textarea
                          value={module.description}
                          onChange={(e) => {
                            const newModules = [...formData.modules];
                            newModules[moduleIndex].description = e.target.value;
                            setFormData({ ...formData, modules: newModules });
                          }}
                          rows={2}
                          className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Code du module
                        </label>
                        <input
                          type="text"
                          value={module.code}
                          onChange={(e) => {
                            const newModules = [...formData.modules];
                            newModules[moduleIndex].code = e.target.value;
                            setFormData({ ...formData, modules: newModules });
                          }}
                          placeholder="ex: PHASE-1"
                          className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700">
                            Compétences
                          </label>
                          <button
                            type="button"
                            onClick={() => addSkill(moduleIndex)}
                            className="flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
                          >
                            <PlusCircle className="h-4 w-4" />
                            <span>Ajouter une compétence</span>
                          </button>
                        </div>

                        <div className="space-y-2">
                          {module.skills.map((skill, skillIndex) => (
                            <div
                              key={skillIndex}
                              className="flex items-start gap-2 bg-white p-3 rounded-lg border border-slate-200"
                            >
                              <GripVertical className="h-5 w-5 text-slate-400" />
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  value={skill.title}
                                  onChange={(e) => {
                                    const newModules = [...formData.modules];
                                    newModules[moduleIndex].skills[
                                      skillIndex
                                    ].title = e.target.value;
                                    setFormData({
                                      ...formData,
                                      modules: newModules,
                                    });
                                  }}
                                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                                  placeholder="Titre de la compétence"
                                  required
                                />
                                <textarea
                                  value={skill.description}
                                  onChange={(e) => {
                                    const newModules = [...formData.modules];
                                    newModules[moduleIndex].skills[
                                      skillIndex
                                    ].description = e.target.value;
                                    setFormData({
                                      ...formData,
                                      modules: newModules,
                                    });
                                  }}
                                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                                  placeholder="Description de la compétence"
                                  rows={1}
                                />
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Code de la compétence
                                  </label>
                                  <input
                                    type="text"
                                    value={skill.code}
                                    onChange={(e) => {
                                      const newModules = [...formData.modules];
                                      newModules[moduleIndex].skills[
                                        skillIndex
                                      ].code = e.target.value;
                                      setFormData({
                                        ...formData,
                                        modules: newModules,
                                      });
                                    }}
                                    placeholder="ex: MANIA-1"
                                    className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                                    required
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  removeSkill(moduleIndex, skillIndex)
                                }
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeModule(moduleIndex)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProgressionTemplateForm;
