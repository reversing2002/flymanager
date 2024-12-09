import React, { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import type { StudentProgressionWithDetails, ProgressionSkill, SkillValidation } from '../../types/progression';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../hooks/useUser';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Eye, BookOpen, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { leaveStudentProgression } from '../../lib/queries/progression';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface StudentProgressionViewProps {
  progressions: StudentProgressionWithDetails[];
  isLoading?: boolean;
  canValidate?: boolean;
  membershipStatus?: 'active' | 'expired' | 'none';
}

interface SkillRowProps {
  skill: ProgressionSkill;
  validation?: SkillValidation;
  progressionId: string;
  canValidate?: boolean;
}

function SkillRow({ skill, validation, progressionId, canValidate }: SkillRowProps) {
  const getStatusIcon = () => {
    if (!validation) return null;
    
    switch (validation.status) {
      case 'validé':
        return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />;
      case 'vu':
        return <Eye className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" />;
      case 'guidé':
        return <BookOpen className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />;
      default:
        return null;
    }
  };

  const getStatusLabel = () => {
    if (!validation) return '';
    
    switch (validation.status) {
      case 'validé':
        return 'Validé';
      case 'vu':
        return 'Vu';
      case 'guidé':
        return 'Guidé';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex items-start space-x-3 flex-1">
        <div className="flex-1">
          <div className="font-medium flex items-center gap-2">
            {skill.title}
            {skill.code && (
              <span className="text-sm text-slate-500">({skill.code})</span>
            )}
          </div>
          {skill.description && (
            <p className="text-sm text-slate-600 mt-1">{skill.description}</p>
          )}
        </div>
        {validation && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${
              validation.status === 'validé' ? 'text-green-600 bg-green-50' :
              validation.status === 'vu' ? 'text-blue-600 bg-blue-50' :
              'text-amber-600 bg-amber-50'
            }`}>
              {getStatusIcon()}
              <span className="text-sm">{getStatusLabel()}</span>
              {validation.instructor && (
                <span className="text-sm text-slate-500 ml-1">
                  par {validation.instructor.first_name} {validation.instructor.last_name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModuleSection({ module, validations, progressionId, canValidate }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const validatedSkills = module.skills.filter(skill => 
    validations?.some(v => v.skill_id === skill.id && v.status === 'validé')
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
              canValidate={canValidate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentProgressionView({ progressions, isLoading, canValidate = false, membershipStatus = 'none' }: StudentProgressionViewProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  // Use all progressions instead of filtering out left ones
  const [selectedProgressionId, setSelectedProgressionId] = useState<string>(progressions?.[0]?.id || '');

  const handleLeaveProgression = async (progressionId: string) => {
    try {
      await leaveStudentProgression(progressionId);
      await queryClient.invalidateQueries(['studentProgressions']);
      toast.success('Formation désassignée avec succès');
    } catch (error) {
      console.error('Erreur lors de la désassignation:', error);
      toast.error('Erreur lors de la désassignation de la formation');
    }
  };

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

  const selectedProgression = progressions.find(p => p.id === selectedProgressionId);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {progressions.length > 1 && (
        <div className="w-full max-w-xs">
          <Select value={selectedProgressionId} onValueChange={setSelectedProgressionId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une formation" />
            </SelectTrigger>
            <SelectContent>
              {progressions.map((progression) => (
                <SelectItem key={progression.id} value={progression.id}>
                  {progression.template.title}
                  {progression.left_at && " (Quittée)"}
                  {progression.completed_at && " (Terminée)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {progressions
        .filter((progression) => progression.id === selectedProgressionId)
        .map((progression) => {
          const totalSkills = progression.template.modules.reduce(
            (sum, module) => sum + module.skills.length,
            0
          );
          const validatedSkills = progression.validations?.filter(v => v.status === 'validé').length || 0;
          const progressPercent = totalSkills > 0
            ? Math.round((validatedSkills / totalSkills) * 100)
            : 0;
          
          return (
            <div key={progression.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                        {progression.template.title}
                      </h2>
                      <p className="text-slate-600 mt-1">
                        {progression.student.first_name} {progression.student.last_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {canValidate && !progression.left_at && !progression.completed_at && (
                        <button
                          onClick={() => handleLeaveProgression(progression.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-4 w-4" />
                          <span>Désassigner</span>
                        </button>
                      )}
                      {membershipStatus === 'expired' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-5 w-5 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Adhésion expirée</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {progression.completed_at && (
                        <div className="text-sm text-green-600 font-medium">
                          Terminé le {format(new Date(progression.completed_at), 'dd MMMM yyyy', { locale: fr })}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Progression globale</span>
                      <span className="text-sm font-medium text-slate-700">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                      <div
                        className="bg-sky-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
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
