import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";

// Champs requis selon la définition des tables
const REQUIRED_FIELDS = {
  member_contributions: [
    'firstname',
    'lastname',
    'valid_from',
    'valid_until'
  ]
};

// Contraintes et options pour les champs
const FIELD_CONSTRAINTS = {
  valid_from: { pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/ },
  valid_until: { pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/ },
  account_entry: {
    payment_method: ['CARD', 'CASH', 'TRANSFER', 'CHECK', 'ACCOUNT'],
    amount: { min: 0, precision: 2 },
    date: { pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/ },
  }
};

const MemberContributionImportTab = () => {
  const { user } = useAuth();
  const [jsonContent, setJsonContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState<'replace' | 'skip'>('skip');
  const [verificationProgress, setVerificationProgress] = useState<{
    users: {
      source: { firstname?: string; lastname?: string };
      found?: { id: string; login?: string; first_name?: string; last_name?: string };
      status: 'pending' | 'success' | 'error';
      contributions?: any[];
    }[];
    currentStep: 'users' | 'saving';
    processing: boolean;
    savedCount: number;
    errorCount: number;
  }>({
    users: [],
    currentStep: 'users',
    processing: false,
    savedCount: 0,
    errorCount: 0
  });

  const handleCopyExample = () => {
    const example = {
      "member_contributions": [
        {
          // Exemple complet avec tous les champs
          "lastname": "Doe",           // Requis
          "firstname": "John",         // Requis
          "valid_from": "2024-01-01T00:00:00Z",  // Requis
          "valid_until": "2024-12-31T23:59:59Z", // Requis
          "document_url": "https://example.com/document.pdf", // Facultatif
          "account_entry": {           // Facultatif
            "amount": 150.00,
            "payment_method": "CARD",
            "entry_type_code": "CONTRIBUTION",
            "date": "2024-01-01T00:00:00Z"
          }
        },
        {
          // Exemple minimal avec uniquement les champs requis
          "lastname": "Martin",
          "firstname": "Alice",
          "valid_from": "2024-01-01T00:00:00Z",
          "valid_until": "2024-12-31T23:59:59Z"
        },
        {
          // Exemple avec document mais sans entrée comptable
          "lastname": "Dubois",
          "firstname": "Pierre",
          "valid_from": "2024-01-01T00:00:00Z",
          "valid_until": "2024-12-31T23:59:59Z",
          "document_url": "https://example.com/attestation.pdf"
        },
        {
          // Exemple avec entrée comptable sans document
          "lastname": "Garcia",
          "firstname": "Marie",
          "valid_from": "2024-01-01T00:00:00Z",
          "valid_until": "2024-12-31T23:59:59Z",
          "account_entry": {
            "amount": 75.00,
            "payment_method": "TRANSFER",
            "entry_type_code": "CONTRIBUTION",
            "date": "2024-01-01T00:00:00Z"
          }
        }
      ]
    };
    setJsonContent(JSON.stringify(example, null, 2));
    toast.success('Exemple copié dans l\'éditeur');
  };

  const validateData = async (data: any) => {
    if (!data.member_contributions || !Array.isArray(data.member_contributions)) {
      throw new Error('Le format JSON doit contenir un tableau "member_contributions"');
    }

    const users = new Set<string>();
    const errors: string[] = [];

    data.member_contributions.forEach((contribution: any, index: number) => {
      // Vérification des champs requis
      for (const field of REQUIRED_FIELDS.member_contributions) {
        if (!contribution[field]) {
          errors.push(`Contribution ${index + 1}: champ requis manquant "${field}"`);
        }
      }

      // Vérification des dates
      if (contribution.valid_from && !FIELD_CONSTRAINTS.valid_from.pattern.test(contribution.valid_from)) {
        errors.push(`Contribution ${index + 1}: format de date invalide pour "valid_from"`);
      }
      if (contribution.valid_until && !FIELD_CONSTRAINTS.valid_until.pattern.test(contribution.valid_until)) {
        errors.push(`Contribution ${index + 1}: format de date invalide pour "valid_until"`);
      }

      // Vérification optionnelle de l'entrée comptable
      if (contribution.account_entry) {
        const entry = contribution.account_entry;
        if (entry.payment_method && !FIELD_CONSTRAINTS.account_entry.payment_method.includes(entry.payment_method)) {
          errors.push(`Contribution ${index + 1}: méthode de paiement invalide "${entry.payment_method}"`);
        }
        if (entry.amount && (typeof entry.amount !== 'number' || entry.amount < FIELD_CONSTRAINTS.account_entry.amount.min)) {
          errors.push(`Contribution ${index + 1}: montant invalide`);
        }
        if (entry.date && !FIELD_CONSTRAINTS.account_entry.date.pattern.test(entry.date)) {
          errors.push(`Contribution ${index + 1}: format de date invalide pour l'entrée comptable`);
        }
      }

      users.add(`${contribution.firstname} ${contribution.lastname}`);
    });

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    return Array.from(users);
  };

  const handleVerifyData = async () => {
    setError(null);
    setSuccess(null);
    setVerificationProgress(prev => ({ ...prev, processing: true }));
    
    try {
      const data = JSON.parse(jsonContent);
      const userNames = await validateData(data);
      
      // Vérification des utilisateurs
      const userPromises = data.member_contributions.map(async (contribution: any) => {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, login, first_name, last_name')
          .ilike('first_name', contribution.firstname)
          .ilike('last_name', contribution.lastname)
          .single();

        return {
          source: { 
            firstname: contribution.firstname,
            lastname: contribution.lastname 
          },
          found: userData,
          status: userData ? 'success' : 'error'
        };
      });

      const userResults = await Promise.all(userPromises);
      setVerificationProgress(prev => ({
        ...prev,
        users: userResults,
        currentStep: 'users',
        processing: false
      }));

      setIsVerificationModalOpen(true);
    } catch (err: any) {
      setError(err.message);
      setVerificationProgress(prev => ({ ...prev, processing: false }));
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const data = JSON.parse(jsonContent);
      const { users } = verificationProgress;

      for (const contribution of data.member_contributions) {
        const user = users.find(u => 
          u.source.firstname === contribution.firstname && 
          u.source.lastname === contribution.lastname
        );
        if (!user?.found?.id) continue;

        // Vérifier les doublons si nécessaire
        if (duplicateHandling === 'skip') {
          const { data: existing } = await supabase
            .from('member_contributions')
            .select('id')
            .eq('user_id', user.found.id)
            .gte('valid_until', contribution.valid_from)
            .lte('valid_from', contribution.valid_until)
            .single();

          if (existing) continue;
        }

        let accountEntryId = null;

        // Créer l'entrée comptable si elle existe
        if (contribution.account_entry) {
          const { data: accountEntry, error: accountError } = await supabase
            .from('account_entries')
            .insert([{
              user_id: user.found.id,
              ...contribution.account_entry
            }])
            .select()
            .single();

          if (accountError) throw accountError;
          accountEntryId = accountEntry.id;
        }

        // Créer la cotisation
        const { error: contributionError } = await supabase
          .from('member_contributions')
          .insert([{
            user_id: user.found.id,
            valid_from: contribution.valid_from,
            valid_until: contribution.valid_until,
            document_url: contribution.document_url,
            account_entry_id: accountEntryId
          }]);

        if (contributionError) throw contributionError;

        setVerificationProgress(prev => ({
          ...prev,
          savedCount: prev.savedCount + 1
        }));
      }

      setSuccess(`Import terminé avec succès. ${verificationProgress.savedCount} cotisations importées.`);
    } catch (err: any) {
      setError(`Erreur lors de l'import: ${err.message}`);
      setVerificationProgress(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={handleCopyExample}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
        >
          <Copy className="w-4 h-4" />
          <span>Copier un exemple</span>
        </button>
      </div>

      <div className="relative">
        <textarea
          value={jsonContent}
          onChange={(e) => setJsonContent(e.target.value)}
          className="w-full h-64 p-4 font-mono text-sm border rounded-md"
          placeholder="Collez votre JSON ici..."
        />
      </div>

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-md">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <pre className="text-sm whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-md">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex justify-end space-x-4">
        <button
          onClick={handleVerifyData}
          disabled={importing || !jsonContent}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          <span>Vérifier les données</span>
        </button>
      </div>

      {isVerificationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Vérification des données</h3>
              <button
                onClick={() => setIsVerificationModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Utilisateurs</h4>
                <div className="space-y-2">
                  {verificationProgress.users.map((user, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {user.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span>
                        {user.source.firstname} {user.source.lastname} {user.found && `→ ${user.found.first_name} ${user.found.last_name}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="skip"
                    checked={duplicateHandling === 'skip'}
                    onChange={(e) => setDuplicateHandling('skip')}
                  />
                  <span>Ignorer les doublons</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="duplicateHandling"
                    value="replace"
                    checked={duplicateHandling === 'replace'}
                    onChange={(e) => setDuplicateHandling('replace')}
                  />
                  <span>Remplacer les doublons</span>
                </label>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || verificationProgress.users.some(u => u.status === 'error')}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Import en cours...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Importer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberContributionImportTab;
