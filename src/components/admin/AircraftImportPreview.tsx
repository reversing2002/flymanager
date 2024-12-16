import { useState } from "react";
import { type AircraftPreview } from "../../lib/aircraftCsvParser";
import AircraftCsvMapping from "./AircraftCsvMapping";

type Props = {
  data: AircraftPreview[];
  csvHeaders: string[];
  csvFirstRow: string[];
  onConfirm: (mapping: Record<string, string>) => void;
  disabled?: boolean;
};

const AircraftImportPreview = ({ 
  data, 
  csvHeaders, 
  csvFirstRow,
  onConfirm, 
  disabled 
}: Props) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"mapping" | "preview">("mapping");

  const handleMappingChange = (newMapping: Record<string, string>) => {
    setMapping(newMapping);
  };

  const handleConfirmMapping = () => {
    setStep("preview");
  };

  const handleConfirmImport = () => {
    onConfirm(mapping);
  };

  const handleBack = () => {
    setStep("mapping");
  };

  if (step === "mapping") {
    return (
      <div className="space-y-4">
        <AircraftCsvMapping
          csvHeaders={csvHeaders}
          csvFirstRow={csvFirstRow}
          onMappingChange={handleMappingChange}
        />
        
        <div className="flex justify-end">
          <button
            onClick={handleConfirmMapping}
            disabled={Object.keys(mapping).length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Continuer vers l'aperçu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Immatriculation
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Taux horaire
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {data.map((aircraft) => (
              <tr key={aircraft.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {aircraft.registration}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {aircraft.aircraftType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {aircraft.hourlyRate} €/h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {aircraft.available ? "Disponible" : "Maintenance"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Retour au mapping
        </button>
        <button
          onClick={handleConfirmImport}
          disabled={disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Confirmer l'import
        </button>
      </div>
    </div>
  );
};

export default AircraftImportPreview;
