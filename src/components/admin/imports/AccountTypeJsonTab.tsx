import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload, X, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";

// Champs requis selon la définition de la table (club_id est ajouté automatiquement)
const REQUIRED_FIELDS = ['code', 'name', 'is_credit'];

// Contraintes et options pour les champs
const FIELD_CONSTRAINTS = {
  code: { pattern: /^[A-Z0-9_]{2,20}$/ }, // Codes en majuscules, chiffres et underscore uniquement
};

const AccountTypeJsonTab = () => {
  const { user } = useAuth();
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState<'replace' | 'skip'>('skip');
  const [systemTypes, setSystemTypes] = useState<any[]>([]);

  useEffect(() => {
    const loadSystemTypes = async () => {
      try {
        const { data: types, error } = await supabase
          .from('account_entry_types')
          .select('*')
          .eq('is_system', true)
          .order('code');

        if (error) throw error;
        setSystemTypes(types || []);
      } catch (err: any) {
        console.error('Erreur lors du chargement des types système:', err);
        toast.error('Erreur lors du chargement des types système');
      }
    };

    loadSystemTypes();
  }, []);

  const generateExampleJson = () => {
    return {
      "account_entry_types": [
        // Types système existants (pour référence)
        ...systemTypes.map(type => ({
          code: type.code,
          name: type.name,
          is_credit: type.is_credit,
          description: type.description
        }))
      ]
    };
  };

  const formatJsonWithHighlight = (json: any): string => {
    const jsonStr = JSON.stringify(json, null, 2);
    return jsonStr
      .replace(/"([^"]+)":/g, '<span class="text-blue-600">"$1"</span>:')
      .replace(/: (".*?")/g, ': <span class="text-green-600">$1</span>')
      .replace(/: (true|false|null|\d+)/g, ': <span class="text-amber-600">$1</span>')
      .split('\n')
      .map(line => {
        if (REQUIRED_FIELDS.some(field => line.includes(`"${field}"`))) {
          return line + ' // REQUIS';
        }
        return line;
      })
      .join('\n');
  };

  const validateEntry = (entry: any) => {
    const errors = [];

    // Ignorer la validation des types système
    if (systemTypes.some(t => t.code === entry.code)) {
      return [];
    }

    // Vérification des champs requis
    for (const field of REQUIRED_FIELDS) {
      if (entry[field] === undefined) {
        errors.push(`Champ requis manquant: ${field}`);
      }
    }

    // Validation du code
    if (entry.code) {
      if (!FIELD_CONSTRAINTS.code.pattern.test(entry.code)) {
        errors.push(`Format de code invalide "${entry.code}". Le code doit contenir uniquement des majuscules, chiffres et underscores (2-20 caractères)`);
      }
      // Vérifier si le code existe déjà dans les types système
      if (systemTypes.some(t => t.code === entry.code)) {
        errors.push(`Le code "${entry.code}" est déjà utilisé par un type système`);
      }
    }

    // Validation du is_credit
    if (entry.is_credit !== undefined && typeof entry.is_credit !== 'boolean') {
      errors.push('Le champ is_credit doit être un booléen (true/false)');
    }

    return errors;
  };

  const handleCopyExample = () => {
    const example = generateExampleJson();
    setJsonContent(JSON.stringify(example, null, 2));
    toast.success('Exemple copié dans l\'éditeur');
  };

  const handleDownloadExample = () => {
    const example = generateExampleJson();
    const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'example_account_types.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exemple téléchargé');
  };

  const handleImport = async () => {
    try {
      if (!user?.club?.id) {
        throw new Error('Vous devez être connecté à un club pour importer des types d\'opérations');
      }

      setError(null);
      setSuccess(null);
      setImporting(true);

      // Parse JSON
      const data = JSON.parse(jsonContent);
      if (!data.account_entry_types || !Array.isArray(data.account_entry_types)) {
        throw new Error('Le JSON doit contenir un tableau "account_entry_types"');
      }

      // Filtrer les types système
      const entries = data.account_entry_types.filter((entry: any) => !systemTypes.some(t => t.code === entry.code));
      const allErrors: string[] = [];

      // Valider chaque entrée
      entries.forEach((entry: any, index: number) => {
        const entryErrors = validateEntry(entry);
        if (entryErrors.length > 0) {
          allErrors.push(`Entrée ${index + 1}:\n${entryErrors.join('\n')}`);
        }
      });

      if (allErrors.length > 0) {
        setError(allErrors.join('\n\n'));
        setImporting(false);
        return;
      }

      // Vérifier les codes uniques
      const codes = entries.map((e: any) => e.code);
      if (new Set(codes).size !== codes.length) {
        setError('Les codes doivent être uniques');
        setImporting(false);
        return;
      }

      // Vérifier si les codes existent déjà dans la base
      const { data: existingTypes } = await supabase
        .from('account_entry_types')
        .select('code')
        .in('code', codes)
        .eq('club_id', user.club.id);

      if (existingTypes && existingTypes.length > 0) {
        const existingCodes = existingTypes.map(t => t.code);
        setError(`Les codes suivants existent déjà: ${existingCodes.join(', ')}`);
        setImporting(false);
        return;
      }

      // Ajouter club_id aux entrées
      const enrichedEntries = entries.map((entry: any) => ({
        ...entry,
        club_id: user.club.id,
        is_system: false
      }));

      // Insérer les données
      const { error: insertError } = await supabase
        .from('account_entry_types')
        .insert(enrichedEntries);

      if (insertError) throw insertError;

      setSuccess(`${entries.length} type(s) d'opération importé(s) avec succès`);
      toast.success('Import réussi');
      setJsonContent('');
      setImporting(false);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur lors de l\'import');
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={handleCopyExample}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier l'exemple
            </button>
            <button
              onClick={handleDownloadExample}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger l'exemple
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={duplicateHandling}
              onChange={(e) => setDuplicateHandling(e.target.value as 'replace' | 'skip')}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="skip">Ignorer les doublons</option>
              <option value="replace">Remplacer les doublons</option>
            </select>
            <button
              onClick={handleImport}
              disabled={importing || !jsonContent}
              className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded-md ${
                importing || !jsonContent
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importation...' : 'Importer'}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center p-4 text-red-800 bg-red-100 rounded-md">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <pre className="whitespace-pre-wrap font-mono text-sm">{error}</pre>
          </div>
        )}

        {success && (
          <div className="flex items-center p-4 text-green-800 bg-green-100 rounded-md">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span>{success}</span>
          </div>
        )}

        <div className="relative">
          <textarea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            className="w-full h-[500px] p-4 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Collez votre JSON ici..."
          />
          <div className="absolute top-2 right-2">
            {jsonContent && (
              <button
                onClick={() => setJsonContent('')}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountTypeJsonTab;
