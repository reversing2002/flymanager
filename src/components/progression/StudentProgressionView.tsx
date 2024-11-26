import React from 'react';
import { Checkbox } from '../ui/checkbox';
import type { StudentProgressionWithDetails, ProgressionSkill, SkillValidation } from '../../types/progression';
import { useQueryClient } from '@tanstack/react-query';
import { validateSkill, removeSkillValidation } from '../../lib/queries/progression';
import { useUser } from '../../hooks/useUser';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

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
    <div className="flex items-center space-x-4 py-2">
      {canValidate && (
        <Checkbox
          checked={!!validation}
          onCheckedChange={(checked) => onValidationToggle(skill.id, !!checked)}
          disabled={!canValidate}
        />
      )}
      <div className="flex-1">
        <div className="font-medium">{skill.title}</div>
        {skill.description && (
          <div className="text-sm text-gray-500">{skill.description}</div>
        )}
      </div>
      {validation && (
        <div className="text-sm text-gray-500">
          Validé le {format(new Date(validation.validated_at), 'dd MMMM yyyy', { locale: fr })}
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
    <div className="space-y-8">
      {progressions.map((progression) => (
        <div key={progression.id} className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-2xl font-bold mb-6">{progression.template.title}</h2>
          <div className="space-y-8">
            {progression.template.modules.map((module) => (
              <div key={module.id} className="space-y-4">
                <h3 className="text-xl font-semibold">{module.title}</h3>
                {module.description && (
                  <p className="text-gray-600 mb-4">{module.description}</p>
                )}
                <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                  {module.skills.map((skill) => (
                    <SkillRow
                      key={skill.id}
                      skill={skill}
                      validation={progression.validations?.find(
                        (v) => v.skill_id === skill.id
                      )}
                      progressionId={progression.id}
                      onValidationToggle={(skillId, validated) =>
                        handleValidationToggle(progression.id, skillId, validated)
                      }
                      canValidate={canValidate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
