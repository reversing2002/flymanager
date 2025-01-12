import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface LicenseData {
  email: string;
  licenseName: string;
  number: string;
  authority: string;
  issuedAt: string;
  expiresAt?: string;
  data?: Record<string, any>;
}

const REQUIRED_FIELDS = ['email', 'licenseName', 'number', 'authority', 'issuedAt'];

const LicenseImportTab = () => {
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
      const isRequiredField = REQUIRED_FIELDS.some(field => line.includes(`"${field}"`));
      if (isRequiredField) {
        return line + ' // REQUIS';
      }
      return line;
    }).join('\n');
  };

  const validateLicenseData = async (data: LicenseData) => {
    const errors: string[] = [];

    if (!data.email) {
      errors.push("L'email est requis");
    }
    if (!data.licenseName) {
      errors.push("Le nom de la licence est requis");
    }
    if (!data.number) {
      errors.push("Le numéro de licence est requis");
    }
    if (!data.authority) {
      errors.push("L'autorité de délivrance est requise");
    }
    if (!data.issuedAt) {
      errors.push("La date de délivrance est requise");
    }

    // Validation du format des dates
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (data.issuedAt && !dateRegex.test(data.issuedAt)) {
      errors.push("Le format de la date de délivrance doit être YYYY-MM-DD");
    }
    if (data.expiresAt && !dateRegex.test(data.expiresAt)) {
      errors.push("Le format de la date d'expiration doit être YYYY-MM-DD");
    }

    // Vérification que la date d'expiration est après la date de délivrance si elle est fournie
    if (data.issuedAt && data.expiresAt) {
      const issuedDate = new Date(data.issuedAt);
      const expiresDate = new Date(data.expiresAt);
      if (expiresDate < issuedDate) {
        errors.push("La date d'expiration doit être postérieure à la date de délivrance");
      }
    }

    // Récupérer le type de licence pour vérifier les champs requis
    const { data: licenseType, error: licenseTypeError } = await supabase
      .from('license_types')
      .select('*')
      .eq('name', data.licenseName)
      .single();

    if (licenseTypeError || !licenseType) {
      errors.push(`Type de licence non trouvé: ${data.licenseName}`);
      return errors;
    }

    // Vérifier si une date d'expiration est requise
    if (licenseType.validity_period && !data.expiresAt) {
      errors.push(`La licence ${data.licenseName} nécessite une date d'expiration car elle a une période de validité de ${licenseType.validity_period} jours`);
    }

    // Vérifier les champs requis personnalisés
    const requiredFields = licenseType.required_fields as Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
    }>;

    requiredFields.forEach(field => {
      if (field.required && (!data.data || !data.data[field.name])) {
        errors.push(`Le champ "${field.label}" est requis pour la licence ${data.licenseName}`);
      }
    });

    return errors;
  };

  const handleImport = async () => {
    setError(null);
    setSuccess(null);
    setImporting(true);

    try {
      const data = JSON.parse(jsonContent);
      const licenseDataArray = Array.isArray(data) ? data : [data];

      for (const licenseData of licenseDataArray) {
        const validationErrors = await validateLicenseData(licenseData);
        if (validationErrors.length > 0) {
          setError(`Erreurs de validation: ${validationErrors.join(', ')}`);
          setImporting(false);
          return;
        }

        // Vérifier si l'utilisateur existe
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', licenseData.email)
          .single();

        if (userError || !userData) {
          setError(`Utilisateur non trouvé pour l'email: ${licenseData.email}`);
          setImporting(false);
          return;
        }

        // Récupérer l'ID du type de licence
        const { data: licenseType, error: licenseTypeError } = await supabase
          .from('license_types')
          .select('id')
          .eq('name', licenseData.licenseName)
          .single();

        if (licenseTypeError || !licenseType) {
          setError(`Type de licence non trouvé: ${licenseData.licenseName}`);
          setImporting(false);
          return;
        }

        // Mise à jour ou création de la licence
        const { error: licenseError } = await supabase
          .from('pilot_licenses')
          .upsert({
            user_id: userData.id,
            license_type_id: licenseType.id,
            number: licenseData.number,
            authority: licenseData.authority,
            issued_at: new Date(licenseData.issuedAt).toISOString(),
            expires_at: licenseData.expiresAt ? new Date(licenseData.expiresAt).toISOString() : null,
            data: licenseData.data || {},
            updated_at: new Date().toISOString()
          }, {
            onConflict: duplicateHandling === 'replace' ? 'user_id,license_type_id' : undefined
          });

        if (licenseError) {
          setError(`Erreur lors de l'importation: ${licenseError.message}`);
          setImporting(false);
          return;
        }
      }

      setSuccess('Importation réussie !');
      toast.success('Les licences ont été importées avec succès.');
    } catch (e) {
      setError(`Erreur lors du parsing JSON: ${e instanceof Error ? e.message : 'Erreur inconnue'}`);
    } finally {
      setImporting(false);
    }
  };

  const handleCopyExample = () => {
    const exampleData = [
      {
        "email": "pilote@example.com",
        "licenseName": "PPL",
        "number": "FRA.FCL.PA00359124",
        "authority": "DGAC",
        "issuedAt": "2025-01-02",
        "expiresAt": "2025-07-31",
        "data": {
          "number": "FRA.FCL.PA00359124",
          "source": "SMILE",
          "ratings": "",
          "authority": "DGAC",
          "last_sync": "2025-01-02T21:21:11.474Z"
        }
      },
      {
        "email": "pilote2@example.com",
        "licenseName": "LAPL",
        "number": "FRA.FCL.LA00123456",
        "authority": "DGAC",
        "issuedAt": "2024-01-15",
        "data": {
          "number": "FRA.FCL.LA00123456",
          "authority": "DGAC",
          "ratings": ""
        }
      },
      {
        "email": "pilote3@example.com",
        "licenseName": "FFA",
        "number": "7822034",
        "authority": "FFA",
        "issuedAt": "2024-01-01",
        "expiresAt": "2024-12-31",
        "data": {
          "lastCotisation": {
            "club": "Aéroclub de St Chamond et de la Vallée du Gier",
            "montant": "89,00 €"
          }
        }
      },
      {
        "email": "pilote4@example.com",
        "licenseName": "ULM classe 3",
        "number": "UL123456",
        "authority": "DGAC",
        "issuedAt": "2024-03-01",
        "data": {
          "numéro de licence": "",
          "emport passager": "",
          "radio": ""
        }
      }
    ];

    navigator.clipboard.writeText(JSON.stringify(exampleData, null, 2))
      .then(() => {
        toast.success('L\'exemple a été copié dans le presse-papiers');
      })
      .catch(() => {
        setJsonContent(formatJsonWithHighlight(exampleData));
        toast.success('L\'exemple a été inséré dans l\'éditeur');
      });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Import des Licences</h2>
        <Button variant="outline" onClick={handleCopyExample}>
          Copier un exemple
        </Button>
      </div>

      <div className="grid gap-4">
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-500">Gestion des doublons:</p>
              <Select
                value={duplicateHandling}
                onValueChange={(value: 'replace' | 'skip') => setDuplicateHandling(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Choisir une option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace">Remplacer</SelectItem>
                  <SelectItem value="skip">Ignorer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              placeholder={`Collez votre JSON ici...

Format attendu:
[
  {
    "email": "pilote@example.com",         // REQUIS: Email du pilote
    "licenseName": "PPL",                  // REQUIS: Nom exact de la licence (PPL, LAPL, FFA, ULM classe 3)
    "number": "FRA.FCL.PPL.A.12345",       // REQUIS: Numéro de licence
    "authority": "DGAC",                   // REQUIS: Autorité de délivrance (DGAC, FFA)
    "issuedAt": "2024-01-01",             // REQUIS: Date de délivrance (YYYY-MM-DD)
    "expiresAt": "2025-01-01",            // OPTIONNEL: Date d'expiration (YYYY-MM-DD)
    "data": {                             // OPTIONNEL: Données supplémentaires selon le type de licence
      // Pour PPL/LAPL:
      "number": "FRA.FCL.PPL.A.12345",
      "source": "SMILE",
      "ratings": "",
      "authority": "DGAC",
      
      // Pour FFA:
      "lastCotisation": {
        "club": "Nom du club",
        "montant": "89,00 €"
      },
      
      // Pour ULM:
      "numéro de licence": "",
      "emport passager": "",
      "radio": ""
    }
  }
]`}
              className="min-h-[400px] font-mono"
            />

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

            <Button 
              onClick={handleImport} 
              disabled={importing || !jsonContent.trim()}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importation en cours...
                </>
              ) : (
                'Importer'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LicenseImportTab;
