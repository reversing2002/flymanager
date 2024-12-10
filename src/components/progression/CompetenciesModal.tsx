import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { getStudentProgressions, validateSkill } from '../../lib/queries/progression';
import type { StudentProgressionWithDetails } from '../../types/progression';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface CompetenciesModalProps {
  studentId: string;
  flightId?: string;
  onClose: () => void;
}

const CompetenciesModal: React.FC<CompetenciesModalProps> = ({
  studentId,
  flightId,
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressions, setProgressions] = useState<StudentProgressionWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showValidated, setShowValidated] = useState<'all' | 'validated' | 'pending'>('all');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log('Current user:', user);
    console.log('User roles:', user?.roles);
    loadProgressions();
  }, [studentId]);

  const loadProgressions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentProgressions(studentId);
      // Filter out left formations
      const activeProgressions = data.filter(p => !p.left_at);
      setProgressions(activeProgressions);
      if (activeProgressions.length > 0) {
        setSelectedTemplate(activeProgressions[0].template.id);
      }
    } catch (err) {
      console.error('Error loading progressions:', err);
      setError('Erreur lors du chargement des progressions');
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const isInstructor = user?.roles?.some(role => role.toUpperCase() === 'INSTRUCTOR');

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const handleValidateSkill = async (progressionId: string, skillId: string, status: 'vu' | 'guidé' | 'validé' = 'validé') => {
    try {
      if (!user?.id) {
        toast.error('Vous devez être connecté pour valider une compétence');
        return;
      }

      console.log('Validating skill with data:', {
        progression_id: progressionId,
        skill_id: skillId,
        instructor_id: user.id,
        flight_id: flightId,
        status: status
      });

      await validateSkill({
        progression_id: progressionId,
        skill_id: skillId,
        instructor_id: user.id,
        flight_id: flightId || null,
        comments: null,
        status: status
      });
      await loadProgressions();
      toast.success('Compétence validée avec succès');
    } catch (err) {
      console.error('Error validating skill:', err);
      toast.error('Erreur lors de la validation');
    }
  };

  const filteredProgressions = progressions
    .filter(progression => !selectedTemplate || progression.template.id === selectedTemplate)
    .map(progression => {
      const filteredModules = progression.template.modules.map(module => ({
        ...module,
        skills: module.skills.filter(skill => {
          const validation = progression.validations.find(v => v.skill_id === skill.id);
          const matchesSearch = searchQuery === '' || 
            skill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (skill.code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
            (module.code?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
          const matchesValidation = 
            showValidated === 'all' ||
            (showValidated === 'validated' && validation) ||
            (showValidated === 'pending' && !validation);
          return matchesSearch && matchesValidation;
        })
      })).filter(module => module.skills.length > 0);

      return {
        ...progression,
        template: {
          ...progression.template,
          modules: filteredModules
        }
      };
    });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Compétences</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une compétence..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                />
              </div>
            </div>
            <select
              value={selectedTemplate || ''}
              onChange={(e) => setSelectedTemplate(e.target.value || null)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            >
              {progressions.map(p => (
                <option key={p.template.id} value={p.template.id}>
                  {p.template.title}
                </option>
              ))}
            </select>
            <select
              value={showValidated}
              onChange={(e) => setShowValidated(e.target.value as 'all' | 'validated' | 'pending')}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="all">Toutes</option>
              <option value="validated">Validées</option>
              <option value="pending">En attente</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-500 gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          ) : filteredProgressions.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              Aucune progression trouvée
            </div>
          ) : (
            <div className="space-y-6">
              {filteredProgressions.map(progression => (
                <div key={progression.id} className="space-y-4">
                  {progression.template.modules.map(module => (
                    <div key={module.id} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full bg-slate-50 p-4 flex items-center justify-between hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {expandedModules.has(module.id) ? (
                            <ChevronDown className="h-5 w-5 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-500" />
                          )}
                          <div className="text-left">
                            <h3 className="font-medium flex items-center gap-2">
                              {module.title}
                              {module.code && (
                                <span className="text-sm text-slate-500">({module.code})</span>
                              )}
                            </h3>
                            {module.description && (
                              <p className="text-sm text-slate-600 mt-1">{module.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                      {expandedModules.has(module.id) && (
                        <div className="divide-y">
                          {module.skills.map(skill => {
                            const validation = progression.validations.find(
                              v => v.skill_id === skill.id
                            );
                            return (
                              <div
                                key={skill.id}
                                className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50"
                              >
                                <div className="flex-1">
                                  <div className="font-medium flex items-center gap-2">
                                    {skill.title}
                                    {skill.code && (
                                      <span className="text-sm text-slate-500">({skill.code})</span>
                                    )}
                                  </div>
                                  {skill.description && (
                                    <p className="text-sm text-slate-600 mt-1">
                                      {skill.description}
                                    </p>
                                  )}
                                  {/* Display validation history */}
                                  {progression.validations
                                    .filter(v => v.skill_id === skill.id)
                                    .sort((a, b) => new Date(b.validated_at).getTime() - new Date(a.validated_at).getTime())
                                    .map((validation, index) => (
                                      <div key={validation.id} className="mt-2 text-sm text-slate-600">
                                        <span className={`${index === 0 ? 'font-medium' : ''}`}>
                                          {new Date(validation.validated_at).toLocaleDateString()} - {validation.status}
                                        </span>
                                        {validation.instructor && (
                                          <span className="ml-1">
                                            par {validation.instructor.first_name} {validation.instructor.last_name}
                                          </span>
                                        )}
                                        {validation.comments && (
                                          <p className="text-sm text-slate-500 mt-1">{validation.comments}</p>
                                        )}
                                      </div>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  {isInstructor && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleValidateSkill(progression.id, skill.id, 'vu')}
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded text-sm transition-colors"
                                      >
                                        Vu
                                      </button>
                                      <button
                                        onClick={() => handleValidateSkill(progression.id, skill.id, 'guidé')}
                                        className="bg-purple-50 hover:bg-purple-100 text-purple-600 px-3 py-1 rounded text-sm transition-colors"
                                      >
                                        Guidé
                                      </button>
                                      <button
                                        onClick={() => handleValidateSkill(progression.id, skill.id, 'validé')}
                                        className="bg-green-50 hover:bg-green-100 text-green-600 px-3 py-1 rounded text-sm transition-colors"
                                      >
                                        Validé
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetenciesModal;
