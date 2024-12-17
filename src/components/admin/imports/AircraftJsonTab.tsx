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
    const jsonStr = JSON.stringify(json, null, 2);
    return jsonStr
      .replace(/"([^"]+)":/g, '<span class="text-blue-600">"$1"</span>:')
      .replace(/: (".*?")/g, ': <span class="text-green-600">$1</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span class="text-purple-600">$1</span>');
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

  const handleExampleDownload = () => {
    const jsonStr = JSON.stringify(EXAMPLE_JSON, null, 2);
    setJsonContent(jsonStr);
    toast.success('Exemple chargé');
  };

  const handleCopyExample = () => {
    const jsonStr = JSON.stringify(EXAMPLE_JSON, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      toast.success('Exemple copié dans le presse-papier');
    });
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
          JSON des aéronefs à importer
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

export default AircraftJsonTab;
