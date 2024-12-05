import React, { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import type { StudentProgressionWithDetails, ProgressionSkill, SkillValidation } from '../../types/progression';
import { useQueryClient } from '@tanstack/react-query';
import { validateSkill, removeSkillValidation } from '../../lib/queries/progression';
import { useUser } from '../../hooks/useUser';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

interface StudentProgressionViewProps {
  progressions: StudentProgressionWithDetails[];
  isLoading?: boolean;
  canValidate?: boolean;
}

interface SkillRowProps {
  skill: ProgressionSkill;
  validation?: SkillValidation;
  progressionId: string;
  onValidationToggle: (skillId: string, validated: boolean) => void;
  canValidate?: boolean;
}

function SkillRow({ skill, validation, progressionId, onValidationToggle, canValidate }: SkillRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex items-start space-x-3 flex-1">
        {canValidate ? (
          <Checkbox
            checked={!!validation}
            onCheckedChange={(checked) => onValidationToggle(skill.id, !!checked)}
            disabled={!canValidate}
            className="mt-1"
          />
        ) : validation && (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900">{skill.title}</div>
          {skill.description && (
            <div className="text-sm text-slate-500 mt-0.5">{skill.description}</div>
          )}
        </div>
      </div>
      {validation && (
        <div className="text-sm text-slate-500 pl-8 sm:pl-0">
          <div>Validé le {format(new Date(validation.validated_at), 'dd MMMM yyyy', { locale: fr })}</div>
          {validation.instructor && (
            <div className="text-slate-400">
              par {validation.instructor.first_name} {validation.instructor.last_name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModuleSection({ module, validations, progressionId, onValidationToggle, canValidate }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const validatedSkills = module.skills.filter(skill => 
    validations?.some(v => v.skill_id === skill.id)
  ).length;
  
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900">{module.title}</h3>
            <div className="text-sm text-slate-500">
              {validatedSkills}/{module.skills.length} validées
            </div>
          </div>
          {module.description && (
            <p className="text-sm text-slate-600 mt-1">{module.description}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="divide-y divide-slate-100">
          {module.skills.map((skill) => (
            <SkillRow
              key={skill.id}
              skill={skill}
              validation={validations?.find(
                (v) => v.skill_id === skill.id
              )}
              progressionId={progressionId}
              onValidationToggle={onValidationToggle}
              canValidate={canValidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentProgressionView({ progressions, isLoading, canValidate = false }: StudentProgressionViewProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (!progressions || progressions.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-slate-900">
          Aucune progression en cours
        </h3>
        <p className="mt-2 text-slate-600">
          Vous n'avez pas encore commencé de formation
        </p>
      </div>
    );
  }

  const handleValidationToggle = async (progressionId: string, skillId: string, validated: boolean) => {
    try {
      if (!user?.id) {
        toast.error('Vous devez être connecté pour valider une compétence');
        return;
      }
      
      if (validated) {
        await validateSkill({
          progression_id: progressionId,
          skill_id: skillId,
          instructor_id: user.id,
          comments: null,
        });
      } else {
        const progression = progressions.find(p => p.id === progressionId);
        const existingValidation = progression?.validations?.find(v => v.skill_id === skillId);
        if (existingValidation) {
          await removeSkillValidation(existingValidation.id);
        }
      }
      
      toast.success(validated ? 'Compétence validée' : 'Validation supprimée');
      queryClient.invalidateQueries(['studentProgressions']);
    } catch (error) {
      console.error('Erreur lors de la validation:', error);
      toast.error('Une erreur est survenue lors de la validation');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {progressions.map((progression) => {
        const totalSkills = progression.template.modules.reduce(
          (sum, module) => sum + module.skills.length,
          0
        );
        const validatedSkills = progression.validations?.length || 0;
        
        return (
          <div key={progression.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                    {progression.template.title}
                  </h2>
                  <p className="text-slate-600 mt-1">
                    {progression.student.first_name} {progression.student.last_name}
                  </p>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Progression globale</span>
                    <span className="text-sm font-medium text-slate-700">
                      {Math.round((validatedSkills / totalSkills) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div
                      className="bg-sky-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${(validatedSkills / totalSkills) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {progression.template.modules.map((module) => (
                <ModuleSection
                  key={module.id}
                  module={module}
                  validations={progression.validations}
                  progressionId={progression.id}
                  onValidationToggle={(skillId, validated) =>
                    handleValidationToggle(progression.id, skillId, validated)
                  }
                  canValidate={canValidate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
