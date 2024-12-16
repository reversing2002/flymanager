import React, { useState, useEffect } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  parseAircraftCsv,
  importAircraft,
  type AircraftPreview,
} from "../../../lib/aircraftCsvParser";
import AircraftImportPreview from "../AircraftImportPreview";
import AircraftCsvMapping from "../AircraftCsvMapping";
import AircraftJsonTab from "./AircraftJsonTab";

type ImportTab = 'csv' | 'json';

const AircraftImportTab = () => {
  const [activeTab, setActiveTab] = useState<ImportTab>('csv');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<AircraftPreview[] | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFirstRow, setCsvFirstRow] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Définition des champs requis pour l'import
  const REQUIRED_FIELDS = {
    name: "Nom",
    registration: "Immatriculation",
    type: "Type d'appareil",
    status: "Statut",
    hourly_rate: "Tarif horaire",
    hours_before_maintenance: "Heures avant maintenance",
    total_hours: "Heures totales",
    last_maintenance: "Dernière maintenance",
    next_maintenance_date: "Prochaine maintenance"
  };

  // Mettre à jour la prévisualisation quand le mapping change
  useEffect(() => {
    if (csvContent && Object.keys(columnMapping).length > 0) {
      try {
        const preview = parseAircraftCsv(csvContent, columnMapping);
        setPreviewData(preview);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
        setPreviewData(null);
      }
    }
  }, [csvContent, columnMapping]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setPreviewData(null);
    setCsvHeaders([]);
    setCsvFirstRow([]);
    setColumnMapping({});

    try {
      const text = await file.text();
      setCsvContent(text);
      
      const lines = text.split("\n").filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error("Le fichier CSV doit contenir au moins une ligne d'en-tête et une ligne de données");
      }

      const headers = lines[0].split(";").map(h => h.trim());
      if (headers.length === 0) {
        throw new Error("Aucune colonne trouvée dans le fichier CSV");
      }
      setCsvHeaders(headers);
      
      const firstDataRow = lines[1].split(";").map(cell => cell.trim());
      setCsvFirstRow(firstDataRow);

    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleColumnMappingChange = (field: string, header: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: header
    }));
  };

  const handleImport = async () => {
    if (!previewData) return;

    // Vérifier que tous les champs requis sont mappés
    const requiredFields = ['name', 'registration', 'type', 'status', 'hourly_rate'];
    const missingFields = requiredFields.filter(
      field => !columnMapping[field]
    );

    if (missingFields.length > 0) {
      setError(`Veuillez mapper tous les champs requis : ${missingFields.map(f => REQUIRED_FIELDS[f as keyof typeof REQUIRED_FIELDS]).join(", ")}`);
      return;
    }

    setImporting(true);
    try {
      await importAircraft(previewData);
      setSuccess("Import réussi !");
      setCsvContent(null);
      setPreviewData(null);
      setCsvHeaders([]);
      setCsvFirstRow([]);
      setColumnMapping({});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('csv')}
            className={`
              ${activeTab === 'csv'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
            `}
          >
            Import CSV
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`
              ${activeTab === 'json'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
            `}
          >
            Import/Export JSON
          </button>
        </nav>
      </div>

      {activeTab === 'csv' ? (
        <>
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50">
            <Upload className="w-12 h-12 mb-4 text-gray-400" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
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

          {csvHeaders.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Mapping des colonnes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(REQUIRED_FIELDS).map(([field, label]) => (
                  <div key={field} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {label}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMapping[field] || ""}
                      onChange={(e) => handleColumnMappingChange(field, e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner une colonne</option>
                      {csvHeaders.map((header, index) => (
                        <option key={header} value={header}>
                          {header} {csvFirstRow[index] ? `(ex: ${csvFirstRow[index]})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewData && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Prévisualisation</h3>
              <AircraftImportPreview data={previewData} />
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {importing ? "Import en cours..." : "Importer les données"}
              </button>
            </div>
          )}
        </>
      ) : (
        <AircraftJsonTab />
      )}
    </div>
  );
};

export default AircraftImportTab;
