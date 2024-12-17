import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload } from 'lucide-react';
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

  const handleImport = async () => {
    try {
      if (!user?.club?.id) {
        throw new Error('Vous devez être connecté à un club pour importer des types d\'opérations');
      }

      setError(null);
      setSuccess(null);

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
        return;
      }

      // Vérifier les codes uniques
      const codes = entries.map((e: any) => e.code);
      if (new Set(codes).size !== codes.length) {
        setError('Les codes doivent être uniques');
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
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur lors de l\'import');
    }
  };

  const copyExample = () => {
    setJsonContent(JSON.stringify(generateExampleJson(), null, 2));
    toast.success('Exemple copié');
  };

  const downloadExample = () => {
    const blob = new Blob([JSON.stringify(generateExampleJson(), null, 2)], { type: 'application/json' });
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

  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-4">
        <div className="flex-1">
          <textarea
            value={jsonContent}
            onChange={(e) => setJsonContent(e.target.value)}
            className="w-full h-96 font-mono text-sm p-4 border rounded"
            placeholder="Collez votre JSON ici..."
          />
        </div>
        <div className="space-y-2">
          <button
            onClick={copyExample}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
          >
            <Copy size={16} />
            <span>Copier l'exemple</span>
          </button>
          <button
            onClick={downloadExample}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
          >
            <Download size={16} />
            <span>Télécharger l'exemple</span>
          </button>
          <button
            onClick={handleImport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            <Upload size={16} />
            <span>Importer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center space-x-2 text-red-600 mb-2">
            <AlertTriangle size={16} />
            <span className="font-medium">Erreur</span>
          </div>
          <pre className="text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <span className="text-green-600">{success}</span>
        </div>
      )}
    </div>
  );
};

export default AccountTypeJsonTab;
