import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";
import { is } from 'date-fns/locale';

// Champs requis selon la définition des tables
const REQUIRED_FIELDS = {
  accounting_categories: ['name'],
  account_entry_types: ['code', 'name'],
  account_entries: ['user_login', 'date', 'amount', 'payment_method', 'entry_type_code'],
};

// Contraintes et options pour les champs
const FIELD_CONSTRAINTS = {
  payment_method: ['CARD', 'CASH', 'TRANSFER', 'CHECK', 'ACCOUNT'],
  amount: { precision: 2 },
  date: { pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/ },
};

const AccountImportTab = () => {
  const { user } = useAuth();
  const [jsonContent, setJsonContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState<'replace' | 'skip'>('skip');
  const [verificationProgress, setVerificationProgress] = useState<{
    users: {
      source: { login?: string; firstname?: string; lastname?: string };
      found?: { id: string; login?: string; first_name?: string; last_name?: string };
      status: 'pending' | 'success' | 'error';
      entries?: any[];
    }[];
    types: {
      code: string;
      found?: { id: string; name: string; is_credit: boolean };
      status: 'pending' | 'success' | 'error';
    }[];
    currentStep: 'users' | 'types' | 'saving';
    processing: boolean;
    savedCount: number;
    errorCount: number;
  }>({
    users: [],
    types: [],
    currentStep: 'users',
    processing: false,
    savedCount: 0,
    errorCount: 0
  });

  const formatJsonWithHighlight = (json: any): string => {
    const jsonStr = JSON.stringify(json, null, 2);
    return jsonStr
      .replace(/"([^"]+)":/g, '<span class="text-blue-600">"$1"</span>:')
      .replace(/: (".*?")/g, ': <span class="text-green-600">$1</span>')
      .replace(/: (true|false|null|\d+)/g, ': <span class="text-amber-600">$1</span>')
      .split('\n')
      .map(line => {
        const field = Object.keys(REQUIRED_FIELDS).find(table =>
          REQUIRED_FIELDS[table as keyof typeof REQUIRED_FIELDS].some(f => line.includes(`"${f}"`))
        );
        if (field) {
          return line + ' // REQUIS';
        }
        return line;
      })
      .join('\n');
  };

  const generateExampleJson = () => {
    return {
      "account_entries": [
        {
          // Exemple 1: Paiement d'une réservation avec un type système
          "user_login": "jpilote",                    // REQUIS: Login de l'utilisateur
          "entry_type_code": "FLIGHT_PAYMENT",        // REQUIS: Type système pour paiement de vol
          "amount": 180.50,                           // REQUIS: Montant en euros
          "date": "2024-01-15",                       // REQUIS: Date de l'opération
          "payment_method": "CARD",                   // REQUIS: CARD, CASH, TRANSFER, CHECK, ACCOUNT
          "description": "Vol DR400 F-GBVR 1.5h",     // Optionnel: Description détaillée
          "reference": "RES-2024-001"                 // Optionnel: Référence externe
        },
        {
          // Exemple 2: Cotisation annuelle avec un type système
          "firstname": "Marie",                       // Alternative à user_login
          "lastname": "Martin",                       // Si user_login n'est pas fourni
          "entry_type_code": "MEMBERSHIP_FEE",        // Type système pour cotisation
          "amount": 150.00,
          "date": "2024-01-01",
          "payment_method": "TRANSFER",
          "description": "Cotisation annuelle 2024"
        },
        {
          // Exemple 3: Achat de matériel avec un type personnalisé
          "user_login": "tresorier",
          "entry_type_code": "EQUIPMENT_PURCHASE",    // Type non-système défini par le club
          "amount": 299.99,
          "date": "2024-01-10",
          "payment_method": "CARD",
          "description": "Achat casque aviation",
          "reference": "FAC-2024-042"
        },
        {
          // Exemple 4: Remboursement avec un type personnalisé
          "firstname": "Thomas",
          "lastname": "Dubois",
          "entry_type_code": "REFUND",               // Type non-système défini par le club
          "amount": 75.00,
          "date": "2024-01-20",
          "payment_method": "TRANSFER",
          "description": "Remboursement avance frais"
        }
      ]
    };
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
    a.download = 'example_accounts.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Exemple téléchargé');
  };

  const startImport = async () => {
    setImporting(true);
    setError(null);
    setSuccess(null);
    setVerificationProgress(prev => ({ ...prev, processing: true }));

    try {
      const data = JSON.parse(jsonContent);
      if (!data.account_entries) {
        throw new Error('Le JSON doit contenir un tableau "account_entries"');
      }

      const entries = data.account_entries;

      // Extraire les valeurs uniques et garder une trace des entrées associées
      const userEntriesMap = new Map();
      const uniqueUsers = [...new Set(entries.map((e, index) => {
        const key = e.user_login ? 
          JSON.stringify({ login: e.user_login }) : 
          JSON.stringify({ 
            firstname: e.firstname.toLowerCase(),
            lastname: e.lastname.toLowerCase()
          });
        
        if (!userEntriesMap.has(key)) {
          userEntriesMap.set(key, []);
        }
        userEntriesMap.get(key).push({ ...e, index });
        
        return key;
      }))].map(key => ({
        ...JSON.parse(key),
        entries: userEntriesMap.get(key)
      }));

      const uniqueTypes = [...new Set(entries
        .filter(e => e.entry_type_code)
        .map(e => e.entry_type_code))];

      // Initialiser l'état de vérification
      setVerificationProgress(prev => ({
        ...prev,
        users: uniqueUsers.map(user => ({
          source: user,
          entries: user.entries,
          status: 'pending'
        })),
        types: uniqueTypes.map(code => ({
          code,
          status: 'pending'
        })),
        currentStep: 'users'
      }));

      // Vérification des utilisateurs
      const verifiedUsers = [];
      for (let i = 0; i < uniqueUsers.length; i++) {
        const user = uniqueUsers[i];
        let found = null;

        if (user.login) {
          const { data: results } = await supabase
            .from('users')
            .select('id, login, first_name, last_name')
            .ilike('login', user.login)
            .single();
          
          found = results;
        } else {
          // Recherche plus tolérante pour les noms/prénoms
          const { data: results } = await supabase
            .from('users')
            .select('id, login, first_name, last_name')
            .or(`first_name.ilike.${user.firstname}%,first_name.ilike.%${user.firstname}%`)
            .or(`last_name.ilike.${user.lastname}%,last_name.ilike.%${user.lastname}%`)
            .limit(1);
          
          found = results?.[0];
        }

        const status = found ? 'success' : 'error';
        verifiedUsers.push({
          source: user,
          entries: user.entries,
          found: found ? {
            ...found,
            firstname: found.first_name,
            lastname: found.last_name
          } : undefined,
          status
        });

        setVerificationProgress(prev => ({
          ...prev,
          users: verifiedUsers,
        }));

        // Petite pause pour l'UI
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Passage à la vérification des types
      setVerificationProgress(prev => ({
        ...prev,
        currentStep: 'types'
      }));

      const verifiedTypes = [];
      for (let i = 0; i < uniqueTypes.length; i++) {
        const typeCode = uniqueTypes[i];
        
        const { data: found } = await supabase
          .from('account_entry_types')
          .select('id, code, name, is_credit')
          .eq('code', typeCode)
          .single();

        const status = found ? 'success' : 'error';
        verifiedTypes.push({
          code: typeCode,
          found: found || undefined,
          status
        });

        setVerificationProgress(prev => ({
          ...prev,
          types: verifiedTypes,
        }));

        // Petite pause pour l'UI
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Une fois que tout est vérifié, on passe à l'insertion/mise à jour
      setVerificationProgress(prev => ({
        ...prev,
        currentStep: 'saving'
      }));

      let savedCount = 0;
      let errorCount = 0;

      try {
        const data = JSON.parse(jsonContent);
        const entries = data.account_entries;

        // On utilise directement les arrays verifiedUsers et verifiedTypes
        const userMap = new Map();
        const usersReady = verifiedUsers.filter(user => user.status === 'success' && user.found?.id);

        usersReady.forEach(user => {
          if (user.found?.id) {
            // Mapper par login si disponible
            if (user.source.login) {
              userMap.set(user.source.login, user.found.id);
            }
            // Mapper aussi par nom/prénom
            if (user.source.firstname && user.source.lastname) {
              const nameKey = `${user.source.firstname.toLowerCase()}_${user.source.lastname.toLowerCase()}`;
              userMap.set(nameKey, user.found.id);
            }
          }
        });

        const typeMap = new Map(
          verifiedTypes
            .filter(t => t.status === 'success' && t.found?.id)
            .map(t => [t.code, { id: t.found.id, is_credit: t.found.is_credit }])
        );

        // Traiter chaque entrée
        for (const entry of entries) {
          try {
            // Trouver l'ID de l'utilisateur
            let userId = null;
            if (entry.user_login) {
              userId = userMap.get(entry.user_login);
            } else if (entry.firstname && entry.lastname) {
              const nameKey = `${entry.firstname.toLowerCase()}_${entry.lastname.toLowerCase()}`;
              userId = userMap.get(nameKey);
            }

            const type = typeMap.get(entry.entry_type_code);
            const typeId = type?.id;

            if (userId && typeId) {
              // Valider le montant par rapport au type d'opération
              let amount = parseFloat(entry.amount);
              const isCredit = type.is_credit;
              
              // Pour un débit, convertir le montant en négatif s'il est positif
              if (!isCredit && amount > 0) {
                amount = -amount;
              }

              console.log('Validation montant:', {
                originalAmount: entry.amount,
                convertedAmount: amount,
                isCredit,
                entry_type_code: entry.entry_type_code
              });

              // Mettre à jour le montant dans l'entrée
              entry.amount = amount;

              // Pour un crédit, le montant doit être positif
              // Pour un débit, le montant doit être négatif
              const isValid = isCredit ? amount >= 0 : amount <= 0;
              
              if (!isValid) {
                const operation = isCredit ? 'crédit' : 'débit';
                const signAttendu = isCredit ? 'positif' : 'négatif';
                throw new Error(`Le montant doit être ${signAttendu} pour une opération de type ${operation} (${entry.entry_type_code})`);
              }

              // Valider le payment_method
              if (!entry.payment_method || !FIELD_CONSTRAINTS.payment_method.includes(entry.payment_method)) {
                throw new Error(`Méthode de paiement invalide. Valeurs acceptées : ${FIELD_CONSTRAINTS.payment_method.join(', ')}`);
              }

              // Vérifier si l'entrée existe déjà
              const { data: existing, error: searchError } = await supabase
                .from('account_entries')
                .select('id')
                .eq('user_id', userId)
                .eq('entry_type_id', typeId)
                .eq('date', entry.date)
                .maybeSingle();

              if (searchError) throw searchError;

              if (existing?.id) {
                // Mise à jour
                const { error: updateError } = await supabase
                  .from('account_entries')
                  .update({
                    amount: entry.amount,
                    description: entry.description || null,
                    payment_method: entry.payment_method,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existing.id);

                if (updateError) throw updateError;
              } else {
                // Insertion
                const { error: insertError } = await supabase
                  .from('account_entries')
                  .insert({
                    user_id: userId,
                    entry_type_id: typeId,
                    amount: entry.amount,
                    payment_method: entry.payment_method,
                    date: entry.date,
                    description: entry.description || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_validated: true,
                    is_club_paid: false,
                    assigned_to_id: userId
                  });

                if (insertError) throw insertError;
              }

              savedCount++;
              setVerificationProgress(prev => ({
                ...prev,
                savedCount: savedCount
              }));

              // Petite pause pour éviter de surcharger la base de données
              await new Promise(resolve => setTimeout(resolve, 50));
            } else {
              errorCount++;
              setVerificationProgress(prev => ({
                ...prev,
                errorCount: errorCount
              }));
            }
          } catch (error) {
            console.error('Error processing entry:', error);
            errorCount++;
            setVerificationProgress(prev => ({
              ...prev,
              errorCount: errorCount
            }));
          }
        }

        console.log(`Finished processing: ${savedCount} saved, ${errorCount} errors`);
      } catch (err) {
        console.error('Verification error:', err);
        toast.error('Erreur lors de la vérification');
      } finally {
        setVerificationProgress(prev => ({ ...prev, processing: false }));
        setImporting(false);
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur lors de l\'importation');
    } finally {
      setImporting(false);
      setVerificationProgress(prev => ({ ...prev, processing: false }));
    }
  };

  const handleImport = () => {
    setIsVerificationModalOpen(true);
    startImport();
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

        {isVerificationModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Vérification et importation des opérations
                </h3>
                <button
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {verificationProgress.processing && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">
                      {verificationProgress.currentStep === 'users' && 'Vérification des utilisateurs...'}
                      {verificationProgress.currentStep === 'types' && 'Vérification des types d\'opérations...'}
                      {verificationProgress.currentStep === 'saving' && 'Enregistrement des opérations...'}
                    </h4>

                    <div className="space-y-2">
                      {verificationProgress.users.map((user, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                          {user.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                          {user.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {user.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                          <span>
                            {user.source.firstname} {user.source.lastname} ({user.source.login})
                          </span>
                        </div>
                      ))}

                      {verificationProgress.types.map((type, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                          {type.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                          {type.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {type.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                          <span>{type.code}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between text-sm text-gray-500 mt-4">
                      <span>{verificationProgress.savedCount} opérations enregistrées</span>
                      <span>{verificationProgress.errorCount} erreurs</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 text-red-800 rounded-md">
                    <div className="flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      <pre className="whitespace-pre-wrap font-mono text-sm">{error}</pre>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 text-green-800 rounded-md">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span>{success}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsVerificationModalOpen(false)}
                  disabled={verificationProgress.processing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {verificationProgress.processing && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md shadow-sm">
            <h3 className="text-lg font-medium mb-4">
              {verificationProgress.currentStep === 'users' && 'Vérification des utilisateurs...'}
              {verificationProgress.currentStep === 'types' && 'Vérification des types d\'opérations...'}
              {verificationProgress.currentStep === 'saving' && 'Enregistrement des opérations...'}
            </h3>

            <div className="space-y-4">
              {verificationProgress.users.map((user, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {user.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  {user.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {user.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                  <span>
                    {user.source.firstname} {user.source.lastname} ({user.source.login})
                  </span>
                </div>
              ))}

              {verificationProgress.types.map((type, index) => (
                <div key={index} className="flex items-center space-x-2">
                  {type.status === 'pending' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  {type.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {type.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                  <span>{type.code}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between text-sm text-gray-500">
              <span>{verificationProgress.savedCount} opérations enregistrées</span>
              <span>{verificationProgress.errorCount} erreurs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountImportTab;