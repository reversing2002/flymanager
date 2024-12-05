import React, { useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { parseAccountsPreview, importAccounts, type AccountPreview } from '../../../lib/accountCsvParser';
import AccountImportPreview from '../AccountImportPreview';

const AccountImportTab = () => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<AccountPreview[] | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const preview = await parseAccountsPreview(text);
      setPreviewData(preview);
    } catch (err) {
      console.error('Preview error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la prévisualisation');
      toast.error('Erreur lors de la prévisualisation');
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleImportConfirm = async () => {
    if (!previewData) return;

    setImporting(true);
    try {
      await importAccounts(previewData);
      setSuccess(`${previewData.length} opérations importées avec succès`);
      toast.success('Import des opérations réussi');
      setPreviewData(null);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
      toast.error('Erreur lors de l\'import des opérations');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p className="whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg">
          {success}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Import des opérations comptables (CSV)
        </label>
        <div className="flex items-center gap-4">
          <label className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="sr-only"
              disabled={importing}
            />
            <span className={`inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 cursor-pointer ${
              importing ? 'opacity-50 cursor-not-allowed' : ''
            }`}>
              <Upload className="h-4 w-4" />
              Sélectionner un fichier
            </span>
          </label>
          {importing && (
            <span className="text-sm text-slate-600">Import en cours...</span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Format attendu: Id;Date d'opération;Nom;Prénom;Montant;Balance;Solde précédent;Mode de paiement;Description
        </p>
      </div>

      {previewData && (
        <AccountImportPreview
          data={previewData}
          onConfirm={handleImportConfirm}
          onCancel={() => setPreviewData(null)}
          loading={importing}
        />
      )}
    </div>
  );
};

export default AccountImportTab;