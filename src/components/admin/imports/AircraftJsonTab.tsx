import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";

// Champs requis selon la définition de la table (club_id est ajouté automatiquement)
const REQUIRED_FIELDS = ['name', 'type', 'registration', 'hourly_rate'];

// Contraintes et options pour les champs
const FIELD_CONSTRAINTS = {
  status: ['AVAILABLE', 'MAINTENANCE', 'RESERVED'],
  hour_format: ['DECIMAL', 'CLASSIC'],
  capacity: { min: 1, max: 99 },
  hourly_rate: { min: 0, precision: 2 },
  total_flight_hours: { min: 0, precision: 1 },
  last_hour_meter: { min: 0, precision: 2 },
  registration: { pattern: /^[A-Za-z0-9]{1,}[-]?[A-Za-z0-9]{1,}$/ },  // Accepte F-BMVS, 42OF, etc.
};

// Types des champs qui nécessitent une conversion
const FIELD_CONVERSIONS = {
  hours_before_maintenance: (value: number) => Math.floor(value), // Conversion en entier (arrondi au plus petit)
};

const EXAMPLE_JSON = {
  "aircraft": [
    {
      // Exemple 1: Robin DR400 (Avion école typique)
      "name": "Robin DR400-120",                    // Nom complet de l'appareil
      "type": "DR400",                             // Type/modèle simplifié
      "registration": "F-BMVS",                    // Format: F-BMVS, 42OF, F-JGHB, etc.
      "hourly_rate": 180.50,                       // Tarif horaire en euros
      "capacity": 4,                               // Nombre de places (pilote inclus)
      "status": "AVAILABLE",                       // AVAILABLE, MAINTENANCE, RESERVED
      "hours_before_maintenance": 50,              // Heures avant prochaine maintenance
      "total_flight_hours": 5234.5,                // Total des heures de vol (1 décimale)
      "total_cycles": 3150,                        // Nombre total d'atterrissages
      "last_hour_meter": 5234.50,                 // Relevé compteur actuel (2 décimales)
      "hour_format": "CLASSIC",                    // CLASSIC (hh:mm) ou DECIMAL (hh.hh)
      "last_maintenance": "2023-12-01T14:30:00Z",  // Date dernière maintenance
      "next_maintenance_date": "2024-03-01",       // Date prochaine maintenance
      "next_maintenance_hours": 5284,              // Compteur prochaine maintenance
      "image_url": "https://example.com/dr400.jpg" // Photo de l'appareil
    },
    {
      // Exemple 2: Cessna 172 (Avion voyage)
      "name": "Cessna 172N Skyhawk",              // Nom complet de l'appareil
      "type": "C172",                             // Type/modèle simplifié
      "registration": "42-OF",                    // Format: 42OF, 42-OF, F-JGHB, etc.
      "hourly_rate": 165.00,                      // Tarif horaire en euros
      "capacity": 4,                              // Nombre de places (pilote inclus)
      "status": "MAINTENANCE",                    // En maintenance
      "hours_before_maintenance": 25,             // Heures avant prochaine maintenance
      "total_flight_hours": 12458.8,              // Total des heures de vol (1 décimale)
      "total_cycles": 8280,                       // Nombre total d'atterrissages
      "last_hour_meter": 12458.80,               // Relevé compteur actuel (2 décimales)
      "hour_format": "DECIMAL",                   // Format décimal pour les heures
      "last_maintenance": "2023-12-15T09:00:00Z", // Date dernière maintenance
      "next_maintenance_date": "2024-01-15",      // Date prochaine maintenance
      "next_maintenance_hours": 12483,            // Compteur prochaine maintenance
      "image_url": "https://example.com/c172.jpg" // Photo de l'appareil
    },
    {
      // Exemple 3: Piper PA28 (Minimum requis)
      "name": "Piper PA28 Warrior",               // REQUIS: Nom de l'appareil
      "type": "PA28",                            // REQUIS: Type d'appareil
      "registration": "42OF",                    // REQUIS: Format: 42OF, 42-OF, F-JGHB
      "hourly_rate": 155.00,                     // REQUIS: Tarif horaire
      "capacity": 4,                             // Optionnel (default: 1)
      "status": "AVAILABLE",                     // Optionnel (default: AVAILABLE)
      "hour_format": "CLASSIC"                   // Optionnel (default: CLASSIC)
    }
  ]
};

const AircraftJsonTab = () => {
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
      const isRequiredField = REQUIRED_FIELDS.some(field => 
        line.trim().startsWith(`"${field}":`));
      
      if (isRequiredField) {
        return line.replace(
          /^(\s*)"([^"]+)": (.*)/,
          '$1<span class="text-blue-600 font-bold">"$2"</span>: <span class="text-blue-600">$3</span>'
        );
      }
      // Mettre en évidence les commentaires
      if (line.includes('//')) {
        const [code, comment] = line.split('//');
        return `${code}<span class="text-gray-500">//${comment}</span>`;
      }
      return line;
    }).join('\n');
  };

  const validateField = (field: string, value: any, index: number): void => {
    const constraints = FIELD_CONSTRAINTS[field as keyof typeof FIELD_CONSTRAINTS];
    if (!constraints) return;

    if (Array.isArray(constraints)) {
      if (value && !constraints.includes(value)) {
        throw new Error(`Avion #${index + 1}: ${field} doit être l'une des valeurs suivantes: ${constraints.join(', ')}`);
      }
    } else if (typeof constraints === 'object') {
      if (constraints.pattern && value && !constraints.pattern.test(value)) {
        throw new Error(`Avion #${index + 1}: ${field} ne respecte pas le format requis`);
      }
      if (constraints.min !== undefined && value < constraints.min) {
        throw new Error(`Avion #${index + 1}: ${field} doit être supérieur ou égal à ${constraints.min}`);
      }
      if (constraints.precision !== undefined) {
        const [, decimals] = value.toString().split('.');
        if (decimals && decimals.length > constraints.precision) {
          throw new Error(`Avion #${index + 1}: ${field} ne peut avoir plus de ${constraints.precision} décimales`);
        }
      }
    }
  };

  const handleImport = async () => {
    setError(null);
    setSuccess(null);
    setImporting(true);

    try {
      const data = JSON.parse(jsonContent);
      
      if (!data.aircraft || !Array.isArray(data.aircraft)) {
        throw new Error('Le JSON doit contenir un tableau "aircraft"');
      }

      // Vérifier que l'utilisateur est connecté et a un club_id
      if (!user?.club?.id) {
        throw new Error('Vous devez être connecté à un club pour importer des avions');
      }

      // Valider chaque avion
      data.aircraft.forEach((aircraft: any, index: number) => {
        // Vérifier les champs requis
        const missingFields = REQUIRED_FIELDS.filter(field => !aircraft[field]);
        if (missingFields.length > 0) {
          throw new Error(`Avion #${index + 1}: Champs requis manquants: ${missingFields.join(', ')}`);
        }

        // Valider et convertir chaque champ
        Object.entries(aircraft).forEach(([field, value]) => {
          // Validation des contraintes
          validateField(field, value, index);
          
          // Conversion si nécessaire
          if (field in FIELD_CONVERSIONS) {
            aircraft[field] = FIELD_CONVERSIONS[field as keyof typeof FIELD_CONVERSIONS](value as number);
          }
        });

        // Ajouter le club_id automatiquement
        aircraft.club_id = user.club.id;
      });

      // Compteurs pour le rapport final
      let added = 0;
      let updated = 0;
      let skipped = 0;

      // Importer les avions
      for (const aircraft of data.aircraft) {
        if (duplicateHandling === 'replace') {
          // Mettre à jour l'avion existant s'il existe
          const { data: existingAircraft, error: selectError } = await supabase
            .from('aircraft')
            .select('id')
            .eq('registration', aircraft.registration)
            .eq('club_id', user.club.id)
            .single();

          if (selectError && selectError.code !== 'PGRST116') throw selectError;

          if (existingAircraft) {
            // Mettre à jour l'avion existant
            const { error: updateError } = await supabase
              .from('aircraft')
              .update({
                name: aircraft.name,
                type: aircraft.type,
                hourly_rate: aircraft.hourly_rate,
                capacity: aircraft.capacity,
                status: aircraft.status,
                hours_before_maintenance: aircraft.hours_before_maintenance,
                hour_format: aircraft.hour_format,
                total_flight_hours: aircraft.total_flight_hours,
                total_cycles: aircraft.total_cycles,
                last_hour_meter: aircraft.last_hour_meter,
                last_maintenance: aircraft.last_maintenance,
                next_maintenance_date: aircraft.next_maintenance_date,
                next_maintenance_hours: aircraft.next_maintenance_hours,
                image_url: aircraft.image_url
              })
              .eq('id', existingAircraft.id);

            if (updateError) throw updateError;
            updated++;
          } else {
            // Insérer le nouvel avion
            const { error: insertError } = await supabase
              .from('aircraft')
              .insert([aircraft]);

            if (insertError) throw insertError;
            added++;
          }
        } else {
          // Mode 'skip': vérifier si l'avion existe
          const { data: existingAircraft } = await supabase
            .from('aircraft')
            .select('registration')
            .eq('registration', aircraft.registration)
            .eq('club_id', user.club.id)
            .single();

          if (existingAircraft) {
            skipped++;
            continue;
          }

          // Insérer le nouvel avion
          const { error: insertError } = await supabase
            .from('aircraft')
            .insert([aircraft]);

          if (insertError) throw insertError;
          added++;
        }
      }

      setSuccess(
        duplicateHandling === 'replace'
          ? `Import terminé : ${added} avion(s) ajouté(s), ${updated} avion(s) mis à jour`
          : `Import terminé : ${added} avion(s) ajouté(s), ${skipped} avion(s) ignoré(s)`
      );
      setJsonContent('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('aircraft')
        .select('*')
        .eq('club_id', user?.club?.id);

      if (error) throw error;

      const exportData = {
        aircraft: data.map(({
          id,
          created_at,
          updated_at,
          club_id,
          ...aircraft
        }) => aircraft)
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aircraft_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Export réussi');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleCopyExample = () => {
    const formatted = JSON.stringify(EXAMPLE_JSON, null, 2);
    setJsonContent(formatted);
    navigator.clipboard.writeText(formatted).then(() => {
      toast.success('Exemple copié dans le presse-papiers', {
        icon: <Copy className="h-4 w-4" />,
        duration: 2000,
      });
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Import/Export JSON</h3>
        <div className="space-x-2">
          <button
            onClick={handleCopyExample}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copier l'exemple
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm text-gray-600">
            Format JSON attendu
          </p>
          <div className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium">
            Champs en bleu = requis
          </div>
          <div className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
            Autres champs = optionnels ou avec valeurs par défaut
          </div>
        </div>
        <pre 
          className="bg-white p-4 rounded border border-gray-200 text-sm font-mono overflow-auto whitespace-pre"
          dangerouslySetInnerHTML={{ __html: formatJsonWithHighlight(EXAMPLE_JSON) }}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="json-content" className="block text-sm font-medium text-gray-700">
          Contenu JSON
        </label>
        <textarea
          id="json-content"
          rows={10}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
          value={jsonContent}
          onChange={(e) => setJsonContent(e.target.value)}
          placeholder="Collez votre JSON ici..."
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">
          En cas de doublon d'immatriculation :
        </label>
        <select
          value={duplicateHandling}
          onChange={(e) => setDuplicateHandling(e.target.value as 'replace' | 'skip')}
          className="mt-1 block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option value="skip">Ignorer</option>
          <option value="replace">Remplacer</option>
        </select>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700">
          {success}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={importing || !jsonContent.trim()}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <Upload className="h-4 w-4 mr-2" />
        {importing ? 'Import en cours...' : 'Importer'}
      </button>
    </div>
  );
};

export default AircraftJsonTab;