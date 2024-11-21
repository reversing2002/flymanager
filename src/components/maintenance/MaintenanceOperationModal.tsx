import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { MaintenanceOperation, MaintenanceType } from '../../types/maintenance';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface MaintenanceOperationModalProps {
  aircraftId: string;
  operation?: MaintenanceOperation;
  onClose: () => void;
  onSuccess: () => void;
}

const MaintenanceOperationModal: React.FC<MaintenanceOperationModalProps> = ({
  aircraftId,
  operation,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [maintenanceTypes, setMaintenanceTypes] = useState<MaintenanceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    maintenanceTypeId: operation?.maintenanceTypeId || '',
    comments: operation?.comments || '',
    performedBy: operation?.performedBy || user?.id || '',
  });

  useEffect(() => {
    loadMaintenanceTypes();
  }, []);

  const loadMaintenanceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_types')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setMaintenanceTypes(data);
    } catch (err) {
      console.error('Error loading maintenance types:', err);
      toast.error('Erreur lors du chargement des types de maintenance');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      if (operation) {
        // Complete existing operation
        const { error: completeError } = await supabase
          .from('maintenance_history')
          .insert({
            aircraft_id: aircraftId,
            maintenance_type_id: operation.maintenanceTypeId,
            performed_at: new Date().toISOString(),
            comments: formData.comments,
            performed_by: formData.performedBy,
          });

        if (completeError) throw completeError;
      } else {
        // Create new operation
        const { error: createError } = await supabase
          .from('aircraft_maintenance_operations')
          .insert({
            aircraft_id: aircraftId,
            maintenance_type_id: formData.maintenanceTypeId,
            last_performed_at: new Date().toISOString(),
            comments: formData.comments,
            performed_by: formData.performedBy,
          });

        if (createError) throw createError;
      }

      toast.success(operation ? 'Maintenance effectuée' : 'Opération créée');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving maintenance:', err);
      setError('Erreur lors de l\'enregistrement');
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {operation ? 'Effectuer une maintenance' : 'Nouvelle opération'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type de maintenance
            </label>
            <select
              value={formData.maintenanceTypeId}
              onChange={(e) => setFormData({ ...formData, maintenanceTypeId: e.target.value })}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              required
              disabled={!!operation}
            >
              <option value="">Sélectionner un type</option>
              {maintenanceTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.intervalValue} {type.type.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Commentaires
            </label>
            <textarea
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={3}
              className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              placeholder="Détails de l'opération..."
            />
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
              {loading ? 'Enregistrement...' : operation ? 'Valider' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceOperationModal;