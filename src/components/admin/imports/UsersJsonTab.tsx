import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";

// Champs requis selon la définition de la table
const REQUIRED_FIELDS = ['first_name', 'last_name', 'email', 'login'];

// Contraintes et options pour les champs
const FIELD_CONSTRAINTS = {
  gender: ['M', 'F', 'O'],
  default_mode: ['default-available', 'default-unavailable'],
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/ },
  instructor_rate: { min: 0, precision: 2 },
  instructor_fee: { min: 0, precision: 2 },
};

const EXAMPLE_JSON = {
  "users": [
    {
      // Exemple 1: Instructeur
      "first_name": "Jean",                      // REQUIS: Prénom
      "last_name": "Dupont",                     // REQUIS: Nom
      "email": "jean.dupont@example.com",        // REQUIS: Email unique
      "login": "jdupont",                        // REQUIS: Login unique
      "phone": "+33612345678",                   // Optionnel: Téléphone
      "gender": "M",                             // Optionnel: M, F, O
      "birth_date": "1985-06-15",               // Optionnel: Date de naissance
      "image_url": "https://example.com/jd.jpg", // Optionnel: Photo de profil
      "address_1": "123 Rue de la Paix",        // Optionnel: Adresse
      "city": "Paris",                          // Optionnel: Ville
      "zip_code": "75001",                      // Optionnel: Code postal
      "country": "France",                      // Optionnel: Pays
      "instructor_rate": 50.00,                 // Optionnel: Taux horaire instructeur
      "instructor_fee": 25.00,                  // Optionnel: Frais instructeur
      "default_mode": "default-available"       // Optionnel: Mode par défaut
    },
    {
      // Exemple 2: Élève (minimum requis)
      "first_name": "Marie",                    // REQUIS
      "last_name": "Martin",                    // REQUIS
      "email": "marie.martin@example.com",      // REQUIS
      "login": "mmartin"                        // REQUIS
    }
  ]
};

const UsersJsonTab = () => {
  const { user } = useAuth();
  const [jsonContent, setJsonContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState<'replace' | 'skip'>('skip');

  const formatJsonWithHighlight = (json: any): string => {
    const jsonString = JSON.stringify(json, null, 2);
    const lines = jsonString.split('\n');
    
    return lines.map(line => {
      // Vérifier si la ligne contient un champ requis
      const isRequiredField = REQUIRED_FIELDS.some(field => line.includes(`"${field}"`));
      if (isRequiredField) {
        return line + ' // REQUIS';
      }
      return line;
    }).join('\n');
  };

  const validateUser = (user: any) => {
    const errors: string[] = [];

    // Vérifier les champs requis
    REQUIRED_FIELDS.forEach(field => {
      if (!user[field]) {
        errors.push(`Le champ "${field}" est requis`);
      }
    });

    // Valider le format email
    if (user.email && !FIELD_CONSTRAINTS.email.pattern.test(user.email)) {
      errors.push(`Format d'email invalide pour "${user.email}"`);
    }

    // Valider le format téléphone
    if (user.phone && !FIELD_CONSTRAINTS.phone.pattern.test(user.phone)) {
      errors.push(`Format de téléphone invalide pour "${user.phone}"`);
    }

    // Valider le genre
    if (user.gender && !FIELD_CONSTRAINTS.gender.includes(user.gender)) {
      errors.push(`Genre invalide "${user.gender}". Valeurs acceptées: ${FIELD_CONSTRAINTS.gender.join(', ')}`);
    }

    // Valider le mode par défaut
    if (user.default_mode && !FIELD_CONSTRAINTS.default_mode.includes(user.default_mode)) {
      errors.push(`Mode par défaut invalide "${user.default_mode}". Valeurs acceptées: ${FIELD_CONSTRAINTS.default_mode.join(', ')}`);
    }

    // Valider les taux instructeur
    if (user.instructor_rate && (user.instructor_rate < FIELD_CONSTRAINTS.instructor_rate.min)) {
      errors.push(`Taux instructeur invalide. Doit être >= ${FIELD_CONSTRAINTS.instructor_rate.min}`);
    }

    if (user.instructor_fee && (user.instructor_fee < FIELD_CONSTRAINTS.instructor_fee.min)) {
      errors.push(`Frais instructeur invalide. Doit être >= ${FIELD_CONSTRAINTS.instructor_fee.min}`);
    }

    return errors;
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      setSuccess(null);

      // Parser le JSON
      const data = JSON.parse(jsonContent);
      if (!data.users || !Array.isArray(data.users)) {
        throw new Error('Le JSON doit contenir un tableau "users"');
      }

      // Valider chaque utilisateur
      const allErrors: string[] = [];
      data.users.forEach((user: any, index: number) => {
        const userErrors = validateUser(user);
        if (userErrors.length > 0) {
          allErrors.push(`Utilisateur ${index + 1} (${user.email}):\n${userErrors.join('\n')}`);
        }
      });

      if (allErrors.length > 0) {
        throw new Error('Erreurs de validation:\n' + allErrors.join('\n\n'));
      }

      // Importer les utilisateurs
      let importedCount = 0;
      let skippedCount = 0;

      for (const userData of data.users) {
        // Vérifier si l'utilisateur existe déjà
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', userData.email)
          .single();

        if (existingUser) {
          if (duplicateHandling === 'skip') {
            skippedCount++;
            continue;
          }
          // Mettre à jour l'utilisateur existant
          await supabase
            .from('users')
            .update(userData)
            .eq('id', existingUser.id);
        } else {
          // Créer un nouvel utilisateur
          await supabase
            .from('users')
            .insert([userData]);
        }
        importedCount++;
      }

      setSuccess(`Import réussi: ${importedCount} utilisateur(s) importé(s), ${skippedCount} ignoré(s)`);
      toast.success('Import réussi');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const handleExampleDownload = () => {
    const jsonStr = formatJsonWithHighlight(EXAMPLE_JSON);
    setJsonContent(jsonStr);
  };

  const handleCopyExample = () => {
    navigator.clipboard.writeText(JSON.stringify(EXAMPLE_JSON, null, 2));
    toast.success('Exemple copié dans le presse-papier');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-4 mb-4">
        <button
          onClick={handleExampleDownload}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Charger l'exemple
        </button>
        <button
          onClick={handleCopyExample}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copier l'exemple
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          JSON des utilisateurs
        </label>
        <textarea
          value={jsonContent}
          onChange={(e) => setJsonContent(e.target.value)}
          className="w-full h-96 p-2 border border-gray-300 rounded-md font-mono text-sm"
          placeholder="Collez votre JSON ici..."
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Gestion des doublons:</span>
          <select
            value={duplicateHandling}
            onChange={(e) => setDuplicateHandling(e.target.value as 'replace' | 'skip')}
            className="border border-gray-300 rounded-md p-1"
          >
            <option value="skip">Ignorer</option>
            <option value="replace">Remplacer</option>
          </select>
        </label>

        <button
          onClick={handleImport}
          disabled={importing || !jsonContent}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <div className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>{importing ? 'Import en cours...' : 'Importer'}</span>
          </div>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-50">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700 whitespace-pre-wrap">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-md bg-green-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersJsonTab;
