import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Search } from 'lucide-react';
import { getStudentProgressions } from '../../lib/queries/progression';
import type { StudentProgressionWithDetails } from '../../types/progression';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface CompetenciesModalProps {
  studentId: string;
  onClose: () => void;
}

const CompetenciesModal: React.FC<CompetenciesModalProps> = ({
  studentId,
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressions, setProgressions] = useState<StudentProgressionWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showValidated, setShowValidated] = useState<'all' | 'validated' | 'pending'>('all');

  useEffect(() => {
    loadProgressions();
  }, [studentId]);

  const loadProgressions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStudentProgressions(studentId);
      setProgressions(data);
      if (data.length > 0) {
        setSelectedTemplate(data[0].template.id);
      }
    } catch (err) {
      console.error('Error loading progressions:', err);
      setError('Erreur lors du chargement des progressions');
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const filteredProgressions = progressions
    .filter(progression => !selectedTemplate || progression.template.id === selectedTemplate)
    .map(progression => {
      // Filter modules and skills based on search and validation status
      const filteredModules = progression.template.modules.map(module => ({
        ...module,
        skills: module.skills.filter(skill => {
          const validation = progression.validations.find(v => v.skill_id === skill.id);
          const matchesSearch = searchQuery === '' || 
            skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            module.name.toLowerCase().includes(searchQuery.toLowerCase());
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
          {/* Search and filters */}
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
              className="px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            >
              {progressions.map(p => (
                <option key={p.template.id} value={p.template.id}>
                  {p.template.name}
                </option>
              ))}
            </select>

            <select
              value={showValidated}
              onChange={(e) => setShowValidated(e.target.value as 'all' | 'validated' | 'pending')}
              className="px-3 py-2 rounded-lg border border-slate-200 focus:border-sky-500 focus:ring-sky-500"
            >
              <option value="all">Tous</option>
              <option value="validated">Validés</option>
              <option value="pending">En attente</option>
            </select>
          </div>
        </div>

        <div className="p-4 overflow-y-auto">
          {error && (
            <div className="p-4 mb-6 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mx-auto" />
              <p className="mt-2 text-sm text-slate-600">Chargement...</p>
            </div>
          ) : filteredProgressions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">Aucune progression trouvée</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredProgressions.map((progression) => (
                <div key={progression.id}>
                  <div className="space-y-4">
                    {progression.template.modules.map((module) => (
                      <div key={module.id} className="space-y-2">
                        <h4 className="font-medium text-slate-900">{module.name}</h4>
                        
                        <div className="grid gap-2">
                          {module.skills.map((skill) => {
                            const validation = progression.validations.find(
                              (v) => v.skill_id === skill.id
                            );
                            
                            return (
                              <div
                                key={skill.id}
                                className="flex items-center justify-between p-2 rounded-lg border hover:bg-slate-50 transition-colors"
                              >
                                <div>
                                  <p className="font-medium text-sm">{skill.name}</p>
                                  {validation?.instructor && (
                                    <p className="text-xs text-slate-500">
                                      Validé par {validation.instructor.first_name} {validation.instructor.last_name}
                                    </p>
                                  )}
                                </div>
                                
                                {validation ? (
                                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-slate-200 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
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
