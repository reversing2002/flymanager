import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PreviewData {
  date: string;
  pilotName: string;
  aircraft: string;
  flightType: string;
  instructor?: string;
  duration: string;
  cost: number;
}

interface ImportPreviewProps {
  data: PreviewData[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ImportPreview: React.FC<ImportPreviewProps> = ({ 
  data, 
  onConfirm, 
  onCancel,
  loading = false 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">Prévisualisation de l'import</h3>
      <p className="text-sm text-slate-600 mb-4">
        Vérifiez que les données sont correctement mappées avant de confirmer l'import.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Pilote</th>
              <th className="text-left p-2">Appareil</th>
              <th className="text-left p-2">Type de vol</th>
              <th className="text-left p-2">Instructeur</th>
              <th className="text-left p-2">Durée</th>
              <th className="text-right p-2">Coût</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="p-2">{format(new Date(row.date), 'dd/MM/yyyy', { locale: fr })}</td>
                <td className="p-2">{row.pilotName}</td>
                <td className="p-2">{row.aircraft}</td>
                <td className="p-2">{row.flightType}</td>
                <td className="p-2">{row.instructor || '-'}</td>
                <td className="p-2">{row.duration}</td>
                <td className="p-2 text-right">{row.cost.toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Import en cours...' : 'Confirmer l\'import'}
        </button>
      </div>
    </div>
  );
};

export default ImportPreview;