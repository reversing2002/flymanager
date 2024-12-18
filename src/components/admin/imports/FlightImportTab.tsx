import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Copy, Download, Upload, X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from "../../../contexts/AuthContext";

// Champs requis selon la définition des tables
const REQUIRED_FIELDS = {
  flights: [
    'lastname',
    'firstname',
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
  payment_method: ['ACCOUNT', 'CARD', 'CASH', 'TRANSFER', 'CHECK'],
  hourly_rate: { min: 0, precision: 2 },
  cost: { min: 0, precision: 2 },
  instructor_fee: { min: 0, precision: 2 },
  date: { pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/ },
  duration: { min: 1 },
  start_hour_meter: { min: 0, precision: 2 },
  end_hour_meter: { min: 0, precision: 2 }
};

const FlightImportTab = () => {
  const { user: authUser } = useAuth();
  const [jsonContent, setJsonContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [duplicateHandling, setDuplicateHandling] = useState<'replace' | 'skip'>('skip');
  const [verificationProgress, setVerificationProgress] = useState<{
    users: {
      source: { lastname: string; firstname: string };
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
      const userIdentifiers = data.flights.map(f => ({
        lastname: f.lastname.toUpperCase(),
        firstname: f.firstname
      }));
      
      const uniqueUsers = Array.from(
        new Set(userIdentifiers.map(u => `${u.lastname}|${u.firstname}`))
      ).map(key => {
        const [lastname, firstname] = key.split('|');
        return { lastname, firstname };
      });

      const userResults = await Promise.all(
        uniqueUsers.map(async ({ lastname, firstname }) => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, login, first_name, last_name')
            .ilike('last_name', lastname)
            .ilike('first_name', firstname)
            .single();

          return {
            source: { lastname, firstname },
            found: userData,
            status: userData ? 'success' : 'error'
          };
        })
      );

      // Vérification des instructeurs
      const instructorLastnames = new Set(
        data.flights
          .filter(f => f.instructor_login)
          .map(f => f.instructor_login)
      );

      const instructorResults = await Promise.all(
        Array.from(instructorLastnames).map(async instructorLogin => {
          // Chercher l'instructeur par login
          let { data: instructorData } = await supabase
            .from('users')
            .select('id, login, first_name, last_name')
            .ilike('login', instructorLogin)
            .single();

          return {
            source: { lastname: instructorLogin },
            found: instructorData,
            status: instructorData ? 'success' : 'error'
          };
        })
      );

      // Combiner les résultats des utilisateurs et instructeurs
      const allUserResults = [...userResults, ...instructorResults];
      
      setVerificationProgress(prev => ({
        ...prev,
        users: allUserResults,
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
      const flightTypeCodes = new Set(data.flights.map(f => f.flight_type_code.trim()));
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
      const hasErrors = [...allUserResults, ...aircraftResults, ...flightTypeResults]
        .some(result => result.status === 'error');

      if (hasErrors) {
        throw new Error('Certaines données référencées n\'existent pas dans la base de données');
      }

      // Création des vols
      let savedCount = 0;
      let errorCount = 0;

      const newFlights = data.flights.map(flight => {
        const user = userResults.find(u =>
          u.source.lastname === flight.lastname.toUpperCase() &&
          u.source.firstname === flight.firstname
        )?.found;

        const aircraft = aircraftResults.find(a =>
          a.registration === flight.aircraft_registration
        )?.found;

        const flightType = flightTypeResults.find(t =>
          t.code === flight.flight_type_code.trim()
        )?.found;

        let instructor = null;
        if (flight.instructor_login) {
          instructor = instructorResults.find(i => 
            i.source.lastname === flight.instructor_login
          )?.found;
        }

        if (!user || !aircraft || !flightType) return null;

        return {
          user_id: user.id,
          aircraft_id: aircraft.id,
          flight_type_id: flightType.id,
          instructor_id: instructor?.id || null,
          date: flight.date,
          duration: flight.duration,
          hourly_rate: flight.hourly_rate,
          cost: flight.cost,
          payment_method: flight.payment_method,
          club_id: authUser?.club?.id,
          is_validated: true,
          start_hour_meter: flight.start_hour_meter || 0,
          end_hour_meter: flight.end_hour_meter || 0,
          instructor_cost: flight.instructor_fee || null
        };
      }).filter(f => f !== null);

      for (const flight of newFlights) {
        // Vérifier si le vol existe déjà
        const { data: existingFlight } = await supabase
          .from('flights')
          .select('id')
          .eq('user_id', flight.user_id)
          .eq('aircraft_id', flight.aircraft_id)
          .eq('date', flight.date)
          .eq('duration', flight.duration)
          .single();

        if (existingFlight) {
          if (duplicateHandling === 'skip') {
            continue; // Passer au vol suivant
          } else {
            // Mettre à jour le vol existant
            const { error: updateError } = await supabase
              .from('flights')
              .update(flight)
              .eq('id', existingFlight.id);

            if (updateError) {
              errorCount++;
              console.error('Update error:', updateError);
            } else {
              savedCount++;
            }
            continue;
          }
        }

        // Si le vol n'existe pas, l'insérer
        const { error: insertError } = await supabase
          .from('flights')
          .insert(flight);

        if (insertError) {
          errorCount++;
          console.error('Insert error:', insertError);
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
      "lastname": "PIANTE",            // Requis - Nom de famille du pilote
      "firstname": "Frederic",         // Requis - Prénom du pilote
      "date": "2024-12-17T00:00:00Z", // Requis - Date et heure du vol au format ISO
      "aircraft_registration": "42OF",  // Requis - Immatriculation de l'avion
      "flight_type_code": "Local",     // Requis - Code du type de vol
      "instructor_login": null,        // Optionnel - Nom de famille de l'instructeur
      "duration": 24,                  // Requis - Durée en minutes
      "hourly_rate": 93.0,            // Requis - Taux horaire
      "cost": 37.2,                   // Requis - Coût total du vol
      "payment_method": "ACCOUNT",     // Requis - ACCOUNT, CARD, CASH ou TRANSFER
      "destination": null,             // Optionnel - Aéroport de destination
      "start_hour_meter": null,        // Optionnel - Relevé compteur début
      "end_hour_meter": null,          // Optionnel - Relevé compteur fin
      "instructor_fee": null           // Optionnel - Tarif instructeur
    },
    {
      "lastname": "VALENTIN",
      "firstname": "Laurent",
      "date": "2024-12-16T00:00:00Z",
      "aircraft_registration": "F-BXTP",
      "flight_type_code": "Local",
      "instructor_login": null,
      "duration": 52,
      "hourly_rate": 147.0,
      "cost": 127.4,
      "payment_method": "ACCOUNT"
    }
  ]
}`;
    navigator.clipboard.writeText(example);
    setJsonContent(example);
    toast.success('Exemple copié dans le presse-papier et inséré dans l\'éditeur');
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
              onClick={() => {}}
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
            {success}
          </div>
        )}

        <textarea
          value={jsonContent}
          onChange={handleJsonChange}
          placeholder="Collez votre JSON ici..."
          className="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isVerificationModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Vérification des données</h3>
              <button
                onClick={() => setIsVerificationModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  verificationProgress.currentStep === 'users' 
                    ? 'bg-blue-500' 
                    : verificationProgress.users.length > 0 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                }`} />
                <span>Vérification des utilisateurs</span>
                {verificationProgress.currentStep === 'users' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </div>

              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  verificationProgress.currentStep === 'aircraft' 
                    ? 'bg-blue-500' 
                    : verificationProgress.aircraft.length > 0 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                }`} />
                <span>Vérification des avions</span>
                {verificationProgress.currentStep === 'aircraft' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </div>

              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  verificationProgress.currentStep === 'flightTypes' 
                    ? 'bg-blue-500' 
                    : verificationProgress.flightTypes.length > 0 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                }`} />
                <span>Vérification des types de vol</span>
                {verificationProgress.currentStep === 'flightTypes' && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </div>

              {verificationProgress.currentStep === 'saving' && (
                <div className="mt-4">
                  <div className="flex justify-between mb-2">
                    <span>Progression</span>
                    <span>{verificationProgress.savedCount} vols importés</span>
                  </div>
                  {verificationProgress.errorCount > 0 && (
                    <div className="text-red-600">
                      {verificationProgress.errorCount} erreurs
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