import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";

// Champs requis selon la définition des tables
const REQUIRED_FIELDS = {
  flights: [
    'user_login',
    'aircraft_registration',
    'flight_type_code',
    'date',
    'duration',
    'hourly_rate',
    'cost',
    'payment_method'
  ]
};

// Contraintes et options pour les champs
const FIELD_CONSTRAINTS = {
  payment_method: ['ACCOUNT', 'CARD', 'CASH', 'TRANSFER'],
  hourly_rate: { min: 0, precision: 2 },
  cost: { min: 0, precision: 2 },
  instructor_fee: { min: 0, precision: 2 },
  date: { pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/ },
  duration: { min: 1 },
  start_hour_meter: { min: 0, precision: 2 },
  end_hour_meter: { min: 0, precision: 2 }
};

const FlightImportTab = () => {
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
    }[];
    aircraft: {
      registration: string;
      found?: { id: string; registration: string };
      status: 'pending' | 'success' | 'error';
    }[];
    flightTypes: {
      code: string;
      found?: { id: string; name: string };
      status: 'pending' | 'success' | 'error';
    }[];
    currentStep: 'users' | 'aircraft' | 'flightTypes' | 'saving';
    processing: boolean;
    savedCount: number;
    errorCount: number;
  }>({
    users: [],
    aircraft: [],
    flightTypes: [],
    currentStep: 'users',
    processing: false,
    savedCount: 0,
    errorCount: 0
  });

  const validateJson = (jsonString: string) => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.flights || !Array.isArray(data.flights)) {
        throw new Error('Le JSON doit contenir un tableau "flights"');
      }

      // Vérification des champs requis
      for (const flight of data.flights) {
        for (const field of REQUIRED_FIELDS.flights) {
          if (!flight[field]) {
            throw new Error(`Champ requis manquant: ${field}`);
          }
        }

        // Validation des contraintes
        if (FIELD_CONSTRAINTS.payment_method.indexOf(flight.payment_method) === -1) {
          throw new Error(`Méthode de paiement invalide: ${flight.payment_method}`);
        }

        if (!FIELD_CONSTRAINTS.date.pattern.test(flight.date)) {
          throw new Error('Format de date invalide');
        }

        if (flight.start_hour_meter && flight.end_hour_meter && 
            parseFloat(flight.start_hour_meter) > parseFloat(flight.end_hour_meter)) {
          throw new Error('Le compteur de fin doit être supérieur au compteur de début');
        }
      }

      return data;
    } catch (err) {
      throw new Error(`Erreur de validation: ${err instanceof Error ? err.message : 'Format JSON invalide'}`);
    }
  };

  const handleJsonChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = event.target.value;
    setJsonContent(content);
    setError(null);
    setSuccess(null);

    if (content.trim()) {
      try {
        validateJson(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de validation');
      }
    }
  };

  const handleImport = async () => {
    if (!jsonContent.trim()) return;

    try {
      const data = validateJson(jsonContent);
      setIsVerificationModalOpen(true);
      setVerificationProgress(prev => ({ ...prev, processing: true }));

      // Vérification des utilisateurs
      const userLogins = new Set([
        ...data.flights.map(f => f.user_login),
        ...data.flights.filter(f => f.instructor_login).map(f => f.instructor_login)
      ]);

      const userResults = await Promise.all(
        Array.from(userLogins).map(async login => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, login, first_name, last_name')
            .eq('login', login)
            .single();

          return {
            source: { login },
            found: userData,
            status: userData ? 'success' : 'error'
          };
        })
      );

      setVerificationProgress(prev => ({
        ...prev,
        users: userResults,
        currentStep: 'aircraft'
      }));

      // Vérification des avions
      const aircraftRegs = new Set(data.flights.map(f => f.aircraft_registration));
      const aircraftResults = await Promise.all(
        Array.from(aircraftRegs).map(async reg => {
          const { data: aircraftData, error: aircraftError } = await supabase
            .from('aircraft')
            .select('id, registration')
            .eq('registration', reg)
            .single();

          return {
            registration: reg,
            found: aircraftData,
            status: aircraftData ? 'success' : 'error'
          };
        })
      );

      setVerificationProgress(prev => ({
        ...prev,
        aircraft: aircraftResults,
        currentStep: 'flightTypes'
      }));

      // Vérification des types de vol
      const flightTypeCodes = new Set(data.flights.map(f => f.flight_type_code));
      const flightTypeResults = await Promise.all(
        Array.from(flightTypeCodes).map(async code => {
          const { data: typeData, error: typeError } = await supabase
            .from('flight_types')
            .select('id, name')
            .eq('code', code)
            .single();

          return {
            code,
            found: typeData,
            status: typeData ? 'success' : 'error'
          };
        })
      );

      setVerificationProgress(prev => ({
        ...prev,
        flightTypes: flightTypeResults,
        currentStep: 'saving'
      }));

      // Si tout est validé, on procède à l'import
      const hasErrors = [...userResults, ...aircraftResults, ...flightTypeResults]
        .some(result => result.status === 'error');

      if (hasErrors) {
        throw new Error('Certaines données référencées n\'existent pas dans la base de données');
      }

      // Création des vols
      let savedCount = 0;
      let errorCount = 0;

      for (const flight of data.flights) {
        const user = userResults.find(u => u.source.login === flight.user_login)?.found;
        const aircraft = aircraftResults.find(a => a.registration === flight.aircraft_registration)?.found;
        const flightType = flightTypeResults.find(t => t.code === flight.flight_type_code)?.found;
        const instructor = flight.instructor_login 
          ? userResults.find(u => u.source.login === flight.instructor_login)?.found
          : null;

        const { error: insertError } = await supabase
          .from('flights')
          .insert({
            user_id: user?.id,
            aircraft_id: aircraft?.id,
            flight_type_id: flightType?.id,
            instructor_id: instructor?.id,
            date: flight.date,
            duration: flight.duration,
            destination: flight.destination,
            hourly_rate: flight.hourly_rate,
            cost: flight.cost,
            payment_method: flight.payment_method,
            instructor_fee: flight.instructor_fee,
            club_id: user?.club_id,
            start_hour_meter: flight.start_hour_meter,
            end_hour_meter: flight.end_hour_meter
          });

        if (insertError) {
          errorCount++;
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

      if (errorCount === 0) {
        setSuccess(`${savedCount} vols importés avec succès`);
        toast.success('Import réussi');
        setJsonContent('');
        setIsVerificationModalOpen(false);
      } else {
        throw new Error(`${errorCount} erreurs lors de l'import`);
      }

    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
      toast.error('Erreur lors de l\'import');
    } finally {
      setImporting(false);
      setVerificationProgress(prev => ({ ...prev, processing: false }));
    }
  };

  const handleCopyExample = () => {
    const example = `{
  "flights": [
    {
      "user_login": "pilote1",  // Le login du pilote (sera converti en user_id)
      "aircraft_registration": "F-ABCD",  // L'immatriculation de l'avion (sera convertie en aircraft_id)
      "flight_type_code": "VFR",  // Le code du type de vol (sera converti en flight_type_id)
      "instructor_login": "instructeur1",  // Optionnel - Le login de l'instructeur
      "date": "2024-12-17T14:30:00Z",  // Date et heure du vol au format ISO
      "duration": 120,  // Durée en minutes
      "destination": "LFPG",  // Optionnel - Aéroport de destination
      "hourly_rate": 150.00,  // Taux horaire
      "cost": 300.00,  // Coût total du vol
      "payment_method": "CARD",  // CARD, CASH, TRANSFER ou ACCOUNT
      "start_hour_meter": 1234.50,  // Optionnel - Relevé compteur début
      "end_hour_meter": 1236.50,  // Optionnel - Relevé compteur fin
      "instructor_fee": 50.00  // Optionnel - Tarif instructeur
    },
    {
      "user_login": "pilote2",
      "aircraft_registration": "F-WXYZ",
      "flight_type_code": "INST",
      "date": "2024-12-17T16:00:00Z",
      "duration": 60,
      "hourly_rate": 180.00,
      "cost": 180.00,
      "payment_method": "ACCOUNT",
      "start_hour_meter": 2345.60,
      "end_hour_meter": 2346.60
    }
  ]
}`;
    navigator.clipboard.writeText(example);
    setJsonContent(example); // Insérer directement l'exemple dans le textarea
    toast.success('Exemple copié dans le presse-papier et inséré dans l\'éditeur');
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p className="whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg">
          {success}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Import des vols (JSON)
          </label>
          <button
            onClick={handleCopyExample}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <Copy className="h-4 w-4" />
            Copier un exemple
          </button>
        </div>

        <textarea
          value={jsonContent}
          onChange={handleJsonChange}
          className="w-full h-96 font-mono text-sm p-4 border border-slate-200 rounded-lg"
          placeholder="Collez votre JSON ici..."
        />

        <div className="mt-4 flex justify-end gap-4">
          <button
            onClick={() => setJsonContent('')}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Effacer
          </button>
          <button
            onClick={handleImport}
            disabled={!jsonContent.trim() || !!error || importing}
            className={`inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 ${
              (!jsonContent.trim() || !!error || importing) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Importer
          </button>
        </div>
      </div>

      {isVerificationModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Vérification des données</h3>
              <button
                onClick={() => !verificationProgress.processing && setIsVerificationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Utilisateurs</h4>
                {verificationProgress.users.map((user, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {user.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>{user.source.login}</span>
                    {user.status === 'success' && (
                      <span className="text-slate-500">
                        → {user.found?.first_name} {user.found?.last_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Avions</h4>
                {verificationProgress.aircraft.map((aircraft, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {aircraft.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>{aircraft.registration}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Types de vol</h4>
                {verificationProgress.flightTypes.map((type, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {type.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>{type.code}</span>
                    {type.status === 'success' && (
                      <span className="text-slate-500">→ {type.found?.name}</span>
                    )}
                  </div>
                ))}
              </div>

              {verificationProgress.currentStep === 'saving' && (
                <div className="text-sm">
                  {verificationProgress.processing ? (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Import en cours...
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="text-emerald-600">
                        {verificationProgress.savedCount} vols importés
                      </div>
                      {verificationProgress.errorCount > 0 && (
                        <div className="text-red-600">
                          {verificationProgress.errorCount} erreurs
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightImportTab;