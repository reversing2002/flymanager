import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";

// Champs requis selon la définition des tables
const REQUIRED_FIELDS = {
  accounting_categories: ['name'],
  account_entry_types: ['code', 'name'],
  account_entries: ['user_login', 'date', 'amount', 'payment_method', 'entry_type_code'],
};

// Contraintes et options pour les champs
const FIELD_CONSTRAINTS = {
  payment_method: ['CARD', 'CASH', 'TRANSFER', 'CHECK', 'ACCOUNT'],
  amount: { min: 0, precision: 2 },
  date: { pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/ },
};

const AccountImportTab = () => {
  const { user } = useAuth();
  const [jsonContent, setJsonContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
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

  useEffect(() => {
    console.log('jsonContent mis à jour:', jsonContent);
  }, [jsonContent]);

  useEffect(() => {
    const loadSystemData = async () => {
      try {
        // Charger les types d'opérations système
        const { data: types, error: typesError } = await supabase
          .from('account_entry_types')
          .select('*')
          .eq('is_system', true)
          .order('code');

        if (typesError) throw typesError;
        setSystemTypes(types || []);

        // Charger les types d'opérations du club
        if (user?.club?.id) {
          const { data: clubTypes, error: clubTypesError } = await supabase
            .from('account_entry_types')
            .select('*')
            .eq('club_id', user?.club?.id)
            .eq('is_system', false)
            .order('code');

          if (clubTypesError) throw clubTypesError;
          setClubTypes(clubTypes || []);
        }

        // Charger les catégories système
        const { data: categories, error: categoriesError } = await supabase
          .from('accounting_categories')
          .select('*')
          .eq('is_system', true)
          .order('display_order');

        if (categoriesError) throw categoriesError;
        setSystemCategories(categories || []);
      } catch (err: any) {
        console.error('Erreur lors du chargement des données système:', err);
        toast.error('Erreur lors du chargement des données système');
      }
    };

    loadSystemData();
  }, [user?.club?.id]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          // Valider que c'est un JSON valide
          JSON.parse(content);
          setJsonContent(content);
          setError(null);
        } catch (err) {
          setError("Le fichier n'est pas un JSON valide");
          setJsonContent('');
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const content = event.clipboardData.getData('text');
    try {
      // Valider que c'est un JSON valide
      JSON.parse(content);
      setJsonContent(content);
      setError(null);
    } catch (err) {
      setError("Le contenu collé n'est pas un JSON valide");
      setJsonContent('');
    }
  };

  const openVerificationModal = () => {
    setIsVerificationModalOpen(true);
    verifyOneByOne();
  };

  const verifyOneByOne = async () => {
    setVerificationProgress(prev => ({ ...prev, processing: true, savedCount: 0, errorCount: 0 }));
    
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
                    updated_at: new Date().toISOString()
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
      }
    } catch (err) {
      console.error('Verification error:', err);
      toast.error('Erreur lors de la vérification');
    } finally {
      setVerificationProgress(prev => ({ ...prev, processing: false }));
    }
  };
  

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erreur
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Import d'opérations comptables
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Importez un fichier JSON contenant les opérations comptables à importer.
              Le fichier doit contenir un tableau "account_entries" avec les champs suivants :
            </p>
            <ul className="list-disc list-inside mt-2">
              <li>user_login ou (firstname et lastname) : Identifiant de l'utilisateur</li>
              <li>entry_type_code : Code du type d'opération</li>
              <li>amount : Montant de l'opération</li>
              <li>date : Date de l'opération (YYYY-MM-DD)</li>
              <li>description : Description de l'opération (optionnel)</li>
              <li>payment_method : Méthode de paiement (optionnel)</li>
            </ul>
          </div>
          <div className="mt-5">
            <div className="flex gap-4">
              <div>
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500">
                  <span>Choisir un fichier</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept="application/json"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(jsonContent);
                    toast.success('Contenu copié dans le presse-papier');
                  }}
                  disabled={!jsonContent}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    !jsonContent ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Copy className="h-4 w-4" />
                  Copier
                </button>

                <button
                  type="button"
                  onClick={openVerificationModal}
                  disabled={!jsonContent || importing}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${
                    (!jsonContent || importing) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Vérifier et importer
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <textarea
              rows={10}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
              value={jsonContent}
              onChange={(e) => {
                const content = e.target.value;
                try {
                  // Valider que c'est un JSON valide si le contenu n'est pas vide
                  if (content) {
                    JSON.parse(content);
                  }
                  setJsonContent(content);
                  setError(null);
                } catch (err) {
                  setError("Le contenu n'est pas un JSON valide");
                }
              }}
              onPaste={handlePaste}
              placeholder="Collez votre JSON ici"
            />
          </div>
        </div>
      </div>

      {isVerificationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-slate-900">
                Vérification détaillée
              </h3>
              <button
                type="button"
                onClick={() => setIsVerificationModalOpen(false)}
                className="text-slate-400 hover:text-slate-500"
              >
                <span className="sr-only">Fermer</span>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-2">
                  Utilisateurs {verificationProgress.currentStep === 'users' && verificationProgress.processing && '(en cours...)'}
                </h4>
                <div className="space-y-2">
                  {verificationProgress.users.map((user, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        user.status === 'success' ? 'border-green-200 bg-green-50' :
                        user.status === 'error' ? 'border-red-200 bg-red-50' :
                        'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {user.source.login ? (
                              `Login: ${user.source.login}`
                            ) : (
                              `${user.source.firstname} ${user.source.lastname}`
                            )}
                          </p>
                          {user.found && (
                            <p className="text-sm text-slate-500">
                              Trouvé: {user.found.login || `${user.found.firstname} ${user.found.lastname}`}
                            </p>
                          )}
                        </div>
                        <div>
                          {user.status === 'pending' && (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                          )}
                          {user.status === 'success' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {user.status === 'error' && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-2">
                  Types d'opérations {verificationProgress.currentStep === 'types' && verificationProgress.processing && '(en cours...)'}
                </h4>
                <div className="space-y-2">
                  {verificationProgress.types.map((type, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        type.status === 'success' ? 'border-green-200 bg-green-50' :
                        type.status === 'error' ? 'border-red-200 bg-red-50' :
                        'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Code: {type.code}
                          </p>
                          {type.found && (
                            <p className="text-sm text-slate-500">
                              Trouvé: {type.found.name}
                            </p>
                          )}
                        </div>
                        <div>
                          {type.status === 'pending' && (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                          )}
                          {type.status === 'success' && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {type.status === 'error' && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {verificationProgress.currentStep === 'saving' && (
                <div>
                  <h4 className="font-medium text-slate-900 mb-2">
                    Sauvegarde des entrées {verificationProgress.processing && '(en cours...)'}
                  </h4>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">
                          {verificationProgress.savedCount} entrées sauvegardées
                          {verificationProgress.errorCount > 0 && (
                            <span className="text-red-500 ml-2">
                              ({verificationProgress.errorCount} erreurs)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        {verificationProgress.processing ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsVerificationModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountImportTab;