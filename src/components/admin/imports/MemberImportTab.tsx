import React, { useState } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { parseMembersPreview, importMembers, type MemberPreview } from '../../../lib/memberCsvParser';
import MemberImportPreview from '../MemberImportPreview';

const MemberImportTab = () => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<MemberPreview[] | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    try {
      const text = await file.text();
      const preview = await parseMembersPreview(text);
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
      await importMembers(previewData);
      setSuccess(`${previewData.length} membres importés avec succès`);
      toast.success('Import des membres réussi');
      setPreviewData(null);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
      toast.error('Erreur lors de l\'import des membres');
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
          Import des membres (CSV)
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
          Format attendu: Id;Nom;Prénom;Email;Téléphone;Rôle;N° Licence;Date Licence;Date Médicale;...
        </p>
      </div>

      {previewData && (
        <MemberImportPreview
          data={previewData}
          onConfirm={handleImportConfirm}
          onCancel={() => setPreviewData(null)}
          loading={importing}
        />
      )}
    </div>
  );
};

export default MemberImportTab;