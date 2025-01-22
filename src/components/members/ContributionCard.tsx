import React from 'react';
import { Edit2, Calendar, Trash2 } from 'lucide-react';
import { dateUtils } from '../../lib/utils/dateUtils';
import type { Contribution } from '../../types/contribution';
import { toast } from 'react-hot-toast';
import { deleteContribution } from '../../lib/queries/contributions';

interface ContributionCardProps {
  contribution: Contribution & {
    account_entry: {
      amount: number;
      entry_type_code: string;
      description: string;
      is_validated?: boolean;
    };
  };
  onEdit: (contribution: Contribution & {
    account_entry: {
      amount: number;
      entry_type_code: string;
      description: string;
    };
  }) => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

const ContributionCard: React.FC<ContributionCardProps> = ({
  contribution,
  onEdit,
  onDelete,
  canEdit = true,
}) => {
  const isExpired = new Date(contribution.valid_until) < new Date();
  const isExpiringSoon = !isExpired && new Date(contribution.valid_until) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette cotisation ?')) {
      return;
    }

    try {
      await deleteContribution(contribution.id);
      toast.success('Cotisation supprimée avec succès');
      onDelete?.();
    } catch (error) {
      console.error('Erreur lors de la suppression de la cotisation:', error);
      toast.error('Erreur lors de la suppression de la cotisation');
    }
  };

  return (
    <div className={`p-6 rounded-xl border transition-colors
      ${isExpired ? 'bg-red-50 border-red-200' : 
        isExpiringSoon ? 'bg-amber-50 border-amber-200' : 
        'bg-white border-slate-200 hover:border-sky-200'
      }
    `}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">
              {dateUtils.formatDate(contribution.valid_from)} - {dateUtils.formatDate(contribution.valid_until)}
            </span>
          </div>
          <p className="text-sm text-slate-500">{contribution.account_entry?.description || 'No description'}</p>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold text-slate-900">
            {contribution.account_entry ? 
              (contribution.account_entry.amount < 0 ? '-' : '') + Math.abs(contribution.account_entry.amount).toFixed(2) : '0.00'} €
          </span>
          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(contribution)}
                className="p-2 text-slate-500 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors"
                title="Modifier la cotisation"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              {!contribution.account_entry?.is_validated && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer la cotisation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {contribution.document_url && (
        <a
          href={contribution.document_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700"
        >
          Voir le document
        </a>
      )}

      {isExpired && (
        <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-lg text-sm">
          Cette cotisation a expiré le {dateUtils.formatDate(contribution.valid_until)}
        </div>
      )}

      {isExpiringSoon && !isExpired && (
        <div className="mt-4 p-3 bg-amber-100 text-amber-800 rounded-lg text-sm">
          Cette cotisation expire le {dateUtils.formatDate(contribution.valid_until)}
        </div>
      )}
    </div>
  );
};

export default ContributionCard;
