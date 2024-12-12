import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, X, Calendar, Infinity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format, addMonths, parse } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import type { QualificationType, PilotQualification } from '../../types/qualifications';

interface EditQualificationsFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface QualificationFormData {
  obtained_at: string;
  expires_at: string | null;
  has_expiration: boolean;
}

const EditQualificationsForm: React.FC<EditQualificationsFormProps> = ({
  userId,
  onClose,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const [qualificationTypes, setQualificationTypes] = useState<QualificationType[]>([]);
  const [pilotQualifications, setPilotQualifications] = useState<PilotQualification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedQualification, setSelectedQualification] = useState<string>('');
  const [editingQualification, setEditingQualification] = useState<string | null>(null);
  const [formData, setFormData] = useState<QualificationFormData>({
    obtained_at: format(new Date(), 'yyyy-MM-dd'),
    expires_at: null,
    has_expiration: false
  });
  const [editFormData, setEditFormData] = useState<QualificationFormData>({
    obtained_at: '',
    expires_at: null,
    has_expiration: false
  });

  useEffect(() => {
    loadData();
  }, [currentUser?.club?.id]);

  const loadData = async () => {
    if (!currentUser?.club?.id) return;

    try {
      // Charger les types de qualifications
      const { data: typesData, error: typesError } = await supabase
        .from('qualification_types')
        .select('*')
        .eq('club_id', currentUser.club.id)
        .order('display_order');

      if (typesError) throw typesError;
      setQualificationTypes(typesData || []);

      // Charger les qualifications du pilote
      const { data: pilotData, error: pilotError } = await supabase
        .from('pilot_qualifications')
        .select(`
          *,
          qualification_type:qualification_types(*)
        `)
        .eq('pilot_id', userId);

      if (pilotError) throw pilotError;
      setPilotQualifications(pilotData || []);
    } catch (err) {
      console.error('Error loading qualifications:', err);
      setError('Erreur lors du chargement des qualifications');
    }
  };

  const handleAddQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQualification) return;

    const qualificationType = qualificationTypes.find(qt => qt.id === selectedQualification);
    if (!qualificationType) return;

    try {
      const obtainedAtDate = parse(formData.obtained_at, 'yyyy-MM-dd', new Date());
      let expiresAt = null;

      if (formData.has_expiration && formData.expires_at) {
        expiresAt = parse(formData.expires_at, 'yyyy-MM-dd', new Date()).toISOString();
      } else if (qualificationType.validity_period) {
        expiresAt = addMonths(obtainedAtDate, qualificationType.validity_period).toISOString();
      }
      
      const newQualification = {
        pilot_id: userId,
        qualification_type_id: selectedQualification,
        obtained_at: obtainedAtDate.toISOString(),
        expires_at: expiresAt,
      };

      const { data, error } = await supabase
        .from('pilot_qualifications')
        .insert([newQualification])
        .select(`
          *,
          qualification_type:qualification_types(*)
        `)
        .single();

      if (error) throw error;

      setPilotQualifications(prev => [...prev, data]);
      setShowAddForm(false);
      setSelectedQualification('');
      setFormData({
        obtained_at: format(new Date(), 'yyyy-MM-dd'),
        expires_at: null,
        has_expiration: false
      });
      toast.success('Qualification ajoutée');
    } catch (err) {
      console.error('Error adding qualification:', err);
      toast.error('Erreur lors de l\'ajout de la qualification');
    }
  };

  const handleStartEditDate = (qualification: PilotQualification) => {
    setEditingQualification(qualification.id);
    setEditFormData({
      obtained_at: format(new Date(qualification.obtained_at), 'yyyy-MM-dd'),
      expires_at: qualification.expires_at 
        ? format(new Date(qualification.expires_at), 'yyyy-MM-dd')
        : null,
      has_expiration: !!qualification.expires_at
    });
  };

  const handleUpdateDate = async (qualification: PilotQualification) => {
    try {
      const obtainedAtDate = parse(editFormData.obtained_at, 'yyyy-MM-dd', new Date());
      let expiresAt = null;

      if (editFormData.has_expiration && editFormData.expires_at) {
        expiresAt = parse(editFormData.expires_at, 'yyyy-MM-dd', new Date()).toISOString();
      } else if (qualification.qualification_type?.validity_period) {
        expiresAt = addMonths(obtainedAtDate, qualification.qualification_type.validity_period).toISOString();
      }

      const { error } = await supabase
        .from('pilot_qualifications')
        .update({
          obtained_at: obtainedAtDate.toISOString(),
          expires_at: expiresAt,
        })
        .eq('id', qualification.id);

      if (error) throw error;

      await loadData();
      setEditingQualification(null);
      toast.success('Qualification mise à jour');
    } catch (err) {
      console.error('Error updating qualification:', err);
      toast.error('Erreur lors de la mise à jour de la qualification');
    }
  };

  const handleDeleteQualification = async (qualificationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette qualification ?')) return;

    try {
      const { error } = await supabase
        .from('pilot_qualifications')
        .delete()
        .eq('id', qualificationId);

      if (error) throw error;

      setPilotQualifications(prev => prev.filter(q => q.id !== qualificationId));
      toast.success('Qualification supprimée');
    } catch (err) {
      console.error('Error deleting qualification:', err);
      toast.error('Erreur lors de la suppression de la qualification');
    }
  };

  const handleValidateQualification = async (qualificationId: string) => {
    try {
      const { error } = await supabase
        .from('pilot_qualifications')
        .update({
          validated_by: currentUser?.id,
          validated_at: new Date().toISOString(),
        })
        .eq('id', qualificationId)
        .select(`
          *,
          qualification_type:qualification_types(*)
        `)
        .single();

      if (error) throw error;

      await loadData();
      toast.success('Qualification validée');
    } catch (err) {
      console.error('Error validating qualification:', err);
      toast.error('Erreur lors de la validation de la qualification');
    }
  };

  const availableQualifications = qualificationTypes.filter(
    qt => !pilotQualifications.some(pq => pq.qualification_type_id === qt.id)
  );

  const renderDateFields = (data: QualificationFormData, onChange: (field: string, value: any) => void) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date d'obtention
        </label>
        <input
          type="date"
          value={data.obtained_at}
          onChange={(e) => onChange('obtained_at', e.target.value)}
          className="w-full border-gray-300 rounded-lg shadow-sm focus:border-sky-500 focus:ring-sky-500"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="has_expiration"
            checked={data.has_expiration}
            onChange={(e) => onChange('has_expiration', e.target.checked)}
            className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300 rounded"
          />
          <label htmlFor="has_expiration" className="ml-2 block text-sm text-gray-700">
            Date d'expiration personnalisée
          </label>
        </div>

        {data.has_expiration && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'expiration
            </label>
            <input
              type="date"
              value={data.expires_at || ''}
              onChange={(e) => onChange('expires_at', e.target.value)}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:border-sky-500 focus:ring-sky-500"
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Modifier les qualifications</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {pilotQualifications.map((qual) => (
              <div
                key={qual.id}
                className="flex items-start justify-between p-4 bg-slate-50 rounded-lg"
              >
                <div className="flex-grow">
                  <div className="font-medium">{qual.qualification_type?.name}</div>
                  {editingQualification === qual.id ? (
                    <div className="mt-2 space-y-4">
                      {renderDateFields(editFormData, (field, value) => {
                        setEditFormData(prev => ({ ...prev, [field]: value }));
                      })}
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => handleUpdateDate(qual)}
                          className="px-3 py-1 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditingQualification(null)}
                          className="px-3 py-1 text-sm text-slate-600 hover:text-slate-700"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                        <span>
                          Obtenue le {format(new Date(qual.obtained_at), 'dd/MM/yyyy')}
                          {qual.expires_at ? (
                            <> • Expire le {format(new Date(qual.expires_at), 'dd/MM/yyyy')}</>
                          ) : (
                            <> • <Infinity className="h-4 w-4 inline" /> Illimitée</>
                          )}
                        </span>
                        <button
                          onClick={() => handleStartEditDate(qual)}
                          className="text-sky-600 hover:text-sky-700"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                      </div>
                      {qual.qualification_type?.requires_instructor_validation && (
                        <div className="mt-2">
                          {qual.validated_at ? (
                            <span className="text-sm text-emerald-600">
                              Validée le {format(new Date(qual.validated_at), 'dd/MM/yyyy')}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleValidateQualification(qual.id)}
                              className="text-sm text-sky-600 hover:text-sky-700"
                            >
                              Valider la qualification
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteQualification(qual.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {showAddForm ? (
            <form onSubmit={handleAddQualification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qualification
                </label>
                <select
                  value={selectedQualification}
                  onChange={(e) => setSelectedQualification(e.target.value)}
                  className="w-full border-gray-300 rounded-lg shadow-sm focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="">Sélectionner une qualification</option>
                  {availableQualifications.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {renderDateFields(formData, (field, value) => {
                setFormData(prev => ({ ...prev, [field]: value }));
              })}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedQualification('');
                    setFormData({
                      obtained_at: format(new Date(), 'yyyy-MM-dd'),
                      expires_at: null,
                      has_expiration: false
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700"
                  disabled={!selectedQualification}
                >
                  Ajouter
                </button>
              </div>
            </form>
          ) : (
            availableQualifications.length > 0 && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 text-sky-600 hover:text-sky-700"
              >
                <Plus className="h-4 w-4" />
                Ajouter une qualification
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQualificationsForm;