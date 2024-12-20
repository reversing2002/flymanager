import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";

const REQUIRED_FIELDS = ['user_login', 'amount', 'date'];

const FIELD_CONSTRAINTS = {
  amount: { min: -100000, precision: 2 },
  date: { pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/ },
};

const BalanceImportTab = () => {
  const { user } = useAuth();
  const [jsonContent, setJsonContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState<'replace' | 'skip'>('skip');
  const [verificationProgress, setVerificationProgress] = useState<{
    users: {
      source: { login?: string; firstname?: string; lastname?: string };
      found?: { id: string; login?: string; first_name?: string; last_name?: string };
      status: 'pending' | 'success' | 'error';
    }[];
    processing: boolean;
    savedCount: number;
    errorCount: number;
  }>({
    users: [],
    processing: false,
    savedCount: 0,
    errorCount: 0
  });

  const formatJsonWithHighlight = (json: any): string => {
    const jsonStr = JSON.stringify(json, null, 2);
    return jsonStr
      .replace(/"([^"]+)":/g, '<span class="text-blue-600">"$1"</span>:')
      .replace(/: (".*?")/g, ': <span class="text-green-600">$1</span>')
      .replace(/: (true|false|null|-?\d+\.?\d*)/g, ': <span class="text-amber-600">$1</span>')
      .split('\n')
      .map(line => {
        if (REQUIRED_FIELDS.some(f => line.includes(`"${f}"`))) {
          return line + ' // REQUIS';
        }
        return line;
      })
      .join('\n');
  };

  const generateExampleJson = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      "balances": [
        {
          "user_login": "jpilote",                    // REQUIS: Login de l'utilisateur
          "firstname": "Jean",                        // Optionnel: Prénom de l'utilisateur
          "lastname": "Pilote",                       // Optionnel: Nom de l'utilisateur
          "amount": 180.50,                           // REQUIS: Montant du solde en euros
          "date": today,                              // REQUIS: Date de l'opération
          "description": "Réinitialisation du solde", // Optionnel: Description
        },
        {
          "firstname": "Marie",                       // Alternative à user_login
          "lastname": "Martin",                       // Si user_login n'est pas fourni
          "amount": -150.00,                         // Solde négatif possible
          "date": today,                             // REQUIS: Date de l'opération
          "description": "Solde initial 2024"
        }
      ]
    };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        JSON.parse(content); // Validation du JSON
        setJsonContent(content);
        setError(null);
      } catch (err) {
        setError("Le fichier n'est pas un JSON valide");
      }
    };
    reader.readAsText(file);
  };

  const validateAndImport = async () => {
    try {
      setImporting(true);
      setError(null);
      setSuccess(null);
      
      const data = JSON.parse(jsonContent);
      if (!data.balances || !Array.isArray(data.balances)) {
        throw new Error("Le JSON doit contenir un tableau 'balances'");
      }

      setVerificationProgress(prev => ({ ...prev, processing: true }));

      // Vérification des utilisateurs
      const userResults = await Promise.all(
        data.balances.map(async (entry: any) => {
          let userQuery = supabase.from('users').select('id, login, first_name, last_name');
          
          if (entry.user_login) {
            userQuery = userQuery.ilike('login', entry.user_login);
          } else if (entry.firstname && entry.lastname) {
            userQuery = userQuery
              .ilike('first_name', entry.firstname)
              .ilike('last_name', entry.lastname);
          } else {
            return {
              entry,
              status: 'error',
              error: "L'entrée doit avoir soit user_login, soit firstname et lastname"
            };
          }

          const { data: users, error: userError } = await userQuery;
          
          if (userError || !users || users.length === 0) {
            return {
              entry,
              status: 'error',
              error: `Utilisateur non trouvé: ${entry.user_login || `${entry.firstname} ${entry.lastname}`}`
            };
          }
          
          if (users.length > 1) {
            return {
              entry,
              status: 'error',
              error: `Plusieurs utilisateurs trouvés pour: ${entry.user_login || `${entry.firstname} ${entry.lastname}`}. Veuillez utiliser le login pour plus de précision.`
            };
          }

          return {
            entry,
            status: 'success',
            userId: users[0].id
          };
        })
      );

      // Filtrer les résultats valides et les erreurs
      const validEntries = userResults.filter(result => result.status === 'success').map(result => ({
        userId: result.userId,
        amount: result.entry.amount,
        date: result.entry.date,
        description: result.entry.description || "Réinitialisation du solde"
      }));

      const errors = userResults.filter(result => result.status === 'error');

      // Import avec gestion des doublons
      let savedCount = 0;
      let errorCount = errors.length;
      let skippedCount = 0;

      for (const entry of validEntries) {
        // Vérifier si une entrée similaire existe déjà
        const { data: existingEntry } = await supabase
          .from('account_entries')
          .select('id')
          .eq('user_id', entry.userId)
          .eq('date', entry.date)
          .eq('entry_type_id', 'd04dc1cb-28e8-44ed-862a-9fff6e9e81ca')
          .eq('amount', entry.amount)
          .single();

        if (existingEntry) {
          if (duplicateHandling === 'skip') {
            skippedCount++;
            continue;
          } else {
            const { error: updateError } = await supabase
              .from('account_entries')
              .update({
                amount: entry.amount,
                description: entry.description,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingEntry.id);

            if (updateError) {
              errorCount++;
              console.error('Erreur de mise à jour:', updateError);
            } else {
              savedCount++;
            }
            continue;
          }
        }

        const { error: insertError } = await supabase
          .from('account_entries')
          .insert({
            user_id: entry.userId,
            date: entry.date,
            amount: entry.amount,
            payment_method: 'ACCOUNT',
            description: entry.description,
            is_validated: true,
            entry_type_id: 'd04dc1cb-28e8-44ed-862a-9fff6e9e81ca',
            assigned_to_id: entry.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          errorCount++;
          console.error('Erreur d\'insertion:', insertError);
        } else {
          savedCount++;
        }
      }

      setVerificationProgress(prev => ({
        ...prev,
        processing: false,
        savedCount,
        errorCount
      }));

      // Construire le message de résultat
      const messages = [];
      if (savedCount > 0) messages.push(`${savedCount} soldes importés`);
      if (skippedCount > 0) messages.push(`${skippedCount} doublons ignorés`);
      if (errors.length > 0) {
        messages.push(`${errors.length} utilisateurs non trouvés`);
        console.error('Utilisateurs non trouvés:', errors.map(e => e.error).join('\n'));
      }

      setSuccess(messages.join(', '));
      
      if (errors.length > 0) {
        toast.error(`${errors.length} utilisateurs n'ont pas été trouvés. Vérifiez la console pour plus de détails.`);
      }
      if (savedCount > 0) {
        toast.success('Import terminé');
      }

    } catch (err: any) {
      setError(err.message);
      toast.error("Erreur lors de l'import");
    } finally {
      setImporting(false);
      setVerificationProgress(prev => ({ ...prev, processing: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-amber-800">
            <h4 className="font-medium mb-1">Important</h4>
            <p className="text-sm">
              Cette fonction permet d'importer les soldes initiaux des membres.
              Chaque solde sera enregistré comme une entrée comptable de type "Réinitialisation du solde".
              Assurez-vous que les données sont correctes avant l'import car cette opération ne peut pas être annulée.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg divide-y">
        <div className="p-4 flex items-center justify-between">
          <div>
            <h3 className="font-medium">Import des soldes</h3>
            <p className="text-sm text-slate-500">Format attendu : fichier JSON</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const example = generateExampleJson();
                navigator.clipboard.writeText(JSON.stringify(example, null, 2));
                setJsonContent(JSON.stringify(example, null, 2));
                toast.success("Exemple copié dans le presse-papier et inséré dans l'éditeur");
              }}
              className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              <Copy className="h-4 w-4" />
              Copier l'exemple
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="relative">
            <textarea
              value={jsonContent}
              onChange={(e) => {
                setJsonContent(e.target.value);
                setError(null);
                try {
                  if (e.target.value) {
                    JSON.parse(e.target.value);
                  }
                } catch (err) {
                  setError("Le JSON n'est pas valide");
                }
              }}
              placeholder="Collez ou écrivez votre JSON ici..."
              className="w-full h-96 p-4 font-mono text-sm bg-slate-50 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            {jsonContent && (
              <button
                onClick={() => setJsonContent('')}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">Gestion des doublons :</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="skip"
                  checked={duplicateHandling === 'skip'}
                  onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'replace')}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm">Ignorer</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="duplicateHandling"
                  value="replace"
                  checked={duplicateHandling === 'replace'}
                  onChange={(e) => setDuplicateHandling(e.target.value as 'skip' | 'replace')}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm">Remplacer</span>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <div className="flex gap-2 text-red-700">
              <XCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border-t border-green-200">
            <div className="flex gap-2 text-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          </div>
        )}

        <div className="p-4 flex justify-end">
          <button
            onClick={validateAndImport}
            disabled={!jsonContent || importing}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium
              ${!jsonContent || importing
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-sky-600 text-white hover:bg-sky-700'
              }
            `}
          >
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            {importing ? 'Import en cours...' : 'Lancer l\'import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceImportTab;
