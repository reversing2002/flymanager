import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { adminClient } from '../../../lib/supabase/adminClient';
import { useAuth } from "../../../contexts/AuthContext";
import { createMember, createAuthAccount } from '../../../lib/queries/users';

// Champs requis selon la définition de la table
const REQUIRED_FIELDS = ['first_name', 'last_name', 'email', 'login'];

// Contraintes et options pour les champs
const FIELD_CONSTRAINTS = {
  gender: ['M', 'F', 'O'],
  default_mode: ['default-available', 'default-unavailable'],
  member_status: ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'],
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
      "default_mode": "default-available",      // Optionnel: Mode par défaut
      "member_status": "ACTIVE"                 // Optionnel: Status du membre (ACTIVE, INACTIVE, PENDING, SUSPENDED)
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

const MemberImportTab = () => {
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

    // Valider le status du membre
    if (user.member_status && !FIELD_CONSTRAINTS.member_status.includes(user.member_status)) {
      errors.push(`Status de membre invalide "${user.member_status}". Valeurs acceptées: ${FIELD_CONSTRAINTS.member_status.join(', ')}`);
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
      if (!user?.club?.id) {
        throw new Error('Vous devez être connecté à un club pour importer des membres');
      }

      setImporting(true);
      setError(null);
      setSuccess(null);

      // Parser le JSON
      const data = JSON.parse(jsonContent);
      if (!data.users || !Array.isArray(data.users)) {
        throw new Error('Le JSON doit contenir un tableau "users"');
      }

      // Limiter aux 5 premiers membres
      const usersToImport = data.users.slice(0, 5);
      console.log('Membres à importer:', usersToImport);
      
      // Valider chaque utilisateur
      const allErrors: string[] = [];
      usersToImport.forEach((user: any, index: number) => {
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
      const createdPasswords: { email: string; password: string }[] = [];

      for (const userData of usersToImport) {
        const { member_status = 'ACTIVE', ...userInfo } = userData;
        
        // Vérifier si l'utilisateur existe déjà
        const { data: existingUser } = await adminClient
          .from('users')
          .select('id, email, auth_id')
          .eq('email', userData.email)
          .single();

        if (existingUser) {
          console.log('Utilisateur existant:', existingUser.email);
          
          // Si l'utilisateur n'a pas de compte auth, on le crée
          if (!existingUser.auth_id) {
            console.log('Création du compte auth pour:', existingUser.email);
            try {
              const { password } = await createAuthAccount({
                firstName: userData.first_name,
                lastName: userData.last_name,
                email: userData.email,
                userId: existingUser.id,
              });
              
              console.log('Compte auth créé avec succès, mot de passe:', password);
              
              createdPasswords.push({
                email: userData.email,
                password: password,
              });
              
              importedCount++;
            } catch (error) {
              console.error('Erreur détaillée lors de la création du compte auth:', error);
              if (error.response) {
                console.error('Réponse d\'erreur:', error.response);
              }
              throw new Error(`Erreur lors de la création du compte auth pour ${userData.email}: ${error.message}`);
            }
          } else {
            console.log('Le compte auth existe déjà pour:', existingUser.email);
            if (duplicateHandling === 'skip') {
              console.log('Ignoré car duplicateHandling = skip');
              skippedCount++;
              continue;
            }
            // Mettre à jour l'utilisateur existant
            await adminClient
              .from('users')
              .update(userInfo)
              .eq('id', existingUser.id);
          }
        } else {
          // Créer un nouvel utilisateur avec createMember
          try {
            console.log('Création du membre:', userData);
            const { password } = await createMember({
              firstName: userData.first_name,
              lastName: userData.last_name,
              email: userData.email,
              roles: [], // Les rôles seront gérés séparément
            });
            
            console.log('Membre créé avec succès, mot de passe:', password);
            
            createdPasswords.push({
              email: userData.email,
              password: password,
            });
            
            importedCount++;
          } catch (error) {
            console.error('Erreur détaillée lors de la création du membre:', error);
            if (error.response) {
              console.error('Réponse d\'erreur:', error.response);
            }
            throw new Error(`Erreur lors de la création du membre ${userData.email}: ${error.message}`);
          }
        }
      }

      setSuccess(
        `Import des 5 premiers membres terminé avec succès!\n` +
        `${importedCount} membres importés\n` +
        `${skippedCount} membres ignorés\n\n` +
        `Identifiants de connexion :\n` +
        createdPasswords.map(({ email, password }) => 
          `${email}: ${password}`
        ).join('\n')
      );
      
      toast.success('Import terminé avec succès!');
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setError(error.message);
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
    <div className="space-y-6">
      {/* En-tête avec les boutons d'action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleExampleDownload}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Charger l'exemple
          </button>
          <button
            onClick={handleCopyExample}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copier l'exemple
          </button>
        </div>

        {/* Options d'import */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Doublons :</span>
            <select
              value={duplicateHandling}
              onChange={(e) => setDuplicateHandling(e.target.value as 'replace' | 'skip')}
              className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="skip">Ignorer</option>
              <option value="replace">Remplacer</option>
            </select>
          </label>

          <button
            onClick={handleImport}
            disabled={importing || !jsonContent}
            className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              importing || !jsonContent
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-sky-500 hover:bg-sky-600'
            }`}
          >
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Import en cours...' : 'Importer'}
          </button>
        </div>
      </div>

      {/* Zone de texte JSON */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          JSON des membres à importer
        </label>
        <textarea
          value={jsonContent}
          onChange={(e) => setJsonContent(e.target.value)}
          className="w-full h-[500px] p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-shadow"
          placeholder="Collez votre JSON ici..."
        />
      </div>

      {/* Messages d'erreur et de succès */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <pre className="text-sm text-green-700 whitespace-pre-wrap font-mono">{success}</pre>
        </div>
      )}
    </div>
  );
};

export default MemberImportTab;