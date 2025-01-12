import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface QualificationData {
  email: string;
  qualificationName: string;
  obtainedAt: string;
  expiresAt?: string;
}

const REQUIRED_FIELDS = ['email', 'qualificationName', 'obtainedAt'];

const QualificationImportTab = () => {
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

  const validateQualificationData = (data: QualificationData) => {
    const errors: string[] = [];

    if (!data.email) {
      errors.push("L'email est requis");
    }
    if (!data.qualificationName) {
      errors.push("Le nom de la qualification est requis");
    }
    if (!data.obtainedAt) {
      errors.push("La date d'obtention de la qualification est requise");
    }

    // Validation du format des dates
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (data.obtainedAt && !dateRegex.test(data.obtainedAt)) {
      errors.push("Le format de la date d'obtention doit être YYYY-MM-DD");
    }
    if (data.expiresAt && !dateRegex.test(data.expiresAt)) {
      errors.push("Le format de la date d'expiration doit être YYYY-MM-DD");
    }

    // Vérification que la date d'expiration est après la date d'obtention si elle est fournie
    if (data.obtainedAt && data.expiresAt) {
      const obtainedDate = new Date(data.obtainedAt);
      const expiresDate = new Date(data.expiresAt);
      if (expiresDate < obtainedDate) {
        errors.push("La date d'expiration doit être postérieure à la date d'obtention");
      }
    }

    return errors;
  };

  const handleImport = async () => {
    setError(null);
    setSuccess(null);
    setImporting(true);

    try {
      const data = JSON.parse(jsonContent);
      const qualificationDataArray = Array.isArray(data) ? data : [data];

      for (const qualificationData of qualificationDataArray) {
        const validationErrors = validateQualificationData(qualificationData);
        if (validationErrors.length > 0) {
          setError(`Erreurs de validation: ${validationErrors.join(', ')}`);
          setImporting(false);
          return;
        }

        // Vérifier si l'utilisateur existe
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', qualificationData.email)
          .single();

        if (userError || !userData) {
          setError(`Utilisateur non trouvé pour l'email: ${qualificationData.email}`);
          setImporting(false);
          return;
        }

        // Récupérer l'ID de la qualification à partir de son nom
        const { data: qualificationTypeData, error: qualificationTypeError } = await supabase
          .from('qualification_types')
          .select('id, requires_instructor_validation, validity_period')
          .eq('name', qualificationData.qualificationName)
          .single();

        if (qualificationTypeError || !qualificationTypeData) {
          setError(`Type de qualification non trouvé: ${qualificationData.qualificationName}`);
          setImporting(false);
          return;
        }

        // Vérifier si une date d'expiration est requise en fonction de validity_period
        if (qualificationTypeData.validity_period && !qualificationData.expiresAt) {
          setError(`La qualification ${qualificationData.qualificationName} nécessite une date d'expiration car elle a une période de validité de ${qualificationTypeData.validity_period} jours`);
          setImporting(false);
          return;
        }

        // Mise à jour ou création de la qualification
        const { error: qualificationError } = await supabase
          .from('pilot_qualifications')
          .upsert({
            pilot_id: userData.id,
            qualification_type_id: qualificationTypeData.id,
            obtained_at: new Date(qualificationData.obtainedAt).toISOString(),
            expires_at: qualificationData.expiresAt ? new Date(qualificationData.expiresAt).toISOString() : null,
            validated_by: qualificationTypeData.requires_instructor_validation ? user?.id : null,
            validated_at: qualificationTypeData.requires_instructor_validation ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: duplicateHandling === 'replace' ? 'pilot_id,qualification_type_id' : undefined
          });

        if (qualificationError) {
          setError(`Erreur lors de l'importation: ${qualificationError.message}`);
          setImporting(false);
          return;
        }
      }

      setSuccess('Importation réussie !');
      toast.success('Les qualifications ont été importées avec succès.');
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
        "qualificationName": "SEP(T)",
        "obtainedAt": "2024-01-01",
        "expiresAt": "2025-01-01"
      },
      {
        "email": "pilote2@example.com",
        "qualificationName": "Train classique",
        "obtainedAt": "2024-02-01"
      }
    ];

    setJsonContent(formatJsonWithHighlight(exampleData));
    toast.success('L\'exemple de JSON a été copié dans l\'éditeur.');
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Import des Qualifications</h2>
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
    "email": "pilote@example.com",    // REQUIS: Email du pilote
    "qualificationName": "SEP(T)",    // REQUIS: Nom exact de la qualification
    "obtainedAt": "2024-01-01",      // REQUIS: Date d'obtention (YYYY-MM-DD)
    "expiresAt": "2025-01-01"        // OPTIONNEL: Date d'expiration (YYYY-MM-DD)
  }
]`}
              className="min-h-[300px] font-mono"
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

export default QualificationImportTab;
