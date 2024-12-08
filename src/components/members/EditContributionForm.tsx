import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Contribution } from '../../types/contribution';
import { createContribution, updateContribution } from '../../lib/queries/contributions';

interface EditContributionFormProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  currentContribution?: Contribution & {
    account_entry: {
      amount: number;
      entry_type_code: string;
      description: string;
      date: string;
    };
  };
}

const EditContributionForm: React.FC<EditContributionFormProps> = ({
  userId,
  onClose,
  onSuccess,
  currentContribution,
}) => {
  const [formData, setFormData] = useState({
    valid_from: currentContribution?.valid_from ? 
      new Date(currentContribution.valid_from).toISOString().split('T')[0] : '',
    valid_until: currentContribution?.valid_until ? 
      new Date(currentContribution.valid_until).toISOString().split('T')[0] : '',
    amount: currentContribution?.account_entry.amount.toString() || '',
    entry_date: currentContribution?.account_entry.date ? 
      new Date(currentContribution.account_entry.date).toISOString().split('T')[0] : 
      new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const contributionData = {
        user_id: userId,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        amount: parseFloat(formData.amount),
        entry_date: formData.entry_date,
      };

      if (currentContribution) {
        await updateContribution(currentContribution.id, contributionData);
        toast.success('Cotisation mise à jour');
      } else {
        await createContribution(contributionData);
        toast.success('Cotisation créée');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving contribution:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {currentContribution ? 'Modifier la cotisation' : 'Ajouter une cotisation'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-500 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="entry_date" className="block text-sm font-medium text-gray-700">
                Date d'opération
              </label>
              <input
                type="date"
                id="entry_date"
                name="entry_date"
                value={formData.entry_date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, entry_date: e.target.value }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="valid_from" className="block text-sm font-medium text-slate-700">
                Date de début
              </label>
              <input
                type="date"
                id="valid_from"
                value={formData.valid_from}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label htmlFor="valid_until" className="block text-sm font-medium text-slate-700">
                Date de fin
              </label>
              <input
                type="date"
                id="valid_until"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className="mt-1 block w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700">
                Montant
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="block w-full rounded-lg border-slate-200 pl-3 pr-12 focus:border-sky-500 focus:ring-sky-500"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-slate-500 sm:text-sm">€</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
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
              {loading ? 'Enregistrement...' : currentContribution ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditContributionForm;
