import React, { useState } from "react";
import { Upload, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  parseAircraftCsv,
  importAircraft,
  type AircraftPreview,
} from "../../../lib/aircraftCsvParser";
import AircraftImportPreview from "../AircraftImportPreview";

const AircraftImportTab = () => {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<AircraftPreview[] | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFirstRow, setCsvFirstRow] = useState<string[]>([]);

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
      
      // Extraire la première ligne de données pour les exemples
      const firstDataRow = lines[1].split(";").map(cell => cell.trim());
      if (firstDataRow.length !== headers.length) {
        throw new Error("Le nombre de colonnes dans les données ne correspond pas aux en-têtes");
      }
      setCsvFirstRow(firstDataRow);
      
    } catch (err) {
      console.error("Preview error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la prévisualisation"
      );
      toast.error("Erreur lors de la prévisualisation");
    } finally {
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleMappingConfirm = (mapping: Record<string, string>) => {
    if (!csvContent) return;

    try {
      const preview = parseAircraftCsv(csvContent, mapping);
      setPreviewData(preview);
    } catch (err) {
      console.error("Mapping error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du mapping des colonnes"
      );
      toast.error("Erreur lors du mapping des colonnes");
    }
  };

  const handleImportConfirm = async () => {
    if (!previewData) return;

    setImporting(true);
    try {
      await importAircraft(previewData);
      setSuccess("Import réussi !");
      setPreviewData(null);
      setCsvContent(null);
      setCsvHeaders([]);
      setCsvFirstRow([]);
      toast.success("Import réussi !");
    } catch (err) {
      console.error("Import error:", err);
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'import"
      );
      toast.error("Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section d'upload */}
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-10 h-10 mb-3 text-slate-400" />
            <p className="mb-2 text-sm text-slate-500">
              <span className="font-semibold">Cliquez pour uploader</span> ou
              glissez-déposez
            </p>
            <p className="text-xs text-slate-500">CSV (séparé par des points-virgules)</p>
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={importing}
          />
        </label>
      </div>

      {/* Messages d'erreur/succès */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Aperçu */}
      {csvHeaders.length > 0 && (
        <AircraftImportPreview
          data={previewData || []}
          csvHeaders={csvHeaders}
          csvFirstRow={csvFirstRow}
          onConfirm={previewData ? handleImportConfirm : handleMappingConfirm}
          disabled={importing}
        />
      )}
    </div>
  );
};

export default AircraftImportTab;
