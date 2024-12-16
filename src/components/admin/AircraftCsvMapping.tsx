import { useState } from 'react';

type FieldMapping = {
  fieldName: string;
  required: boolean;
  description: string;
  example: string;
  format: string;
};

const AIRCRAFT_FIELDS: FieldMapping[] = [
  {
    fieldName: 'registration',
    required: true,
    description: 'Immatriculation de l\'appareil',
    example: 'F-ABCD',
    format: 'Texte',
  },
  {
    fieldName: 'name',
    required: true,
    description: 'Nom de l\'appareil',
    example: 'Robin DR400',
    format: 'Texte',
  },
  {
    fieldName: 'type',
    required: true,
    description: 'Type d\'appareil',
    example: 'DR400',
    format: 'Texte',
  },
  {
    fieldName: 'hourly_rate',
    required: true,
    description: 'Taux horaire',
    example: '180.50',
    format: 'Nombre décimal',
  },
  {
    fieldName: 'status',
    required: true,
    description: 'État de l\'appareil',
    example: 'AVAILABLE ou MAINTENANCE',
    format: 'AVAILABLE/MAINTENANCE',
  },
  {
    fieldName: 'hours_before_maintenance',
    required: false,
    description: 'Heures avant la prochaine maintenance',
    example: '50',
    format: 'Nombre entier',
  },
  {
    fieldName: 'total_hours',
    required: false,
    description: 'Nombre total d\'heures de vol',
    example: '1234.5',
    format: 'Nombre décimal',
  },
  {
    fieldName: 'last_maintenance',
    required: false,
    description: 'Date de la dernière maintenance',
    example: '2024-01-15',
    format: 'Date (YYYY-MM-DD)',
  },
  {
    fieldName: 'next_maintenance_date',
    required: false,
    description: 'Date de la prochaine maintenance',
    example: '2024-07-15',
    format: 'Date (YYYY-MM-DD)',
  },
];

type Props = {
  csvHeaders: string[];
  csvFirstRow: string[];
  onMappingChange: (mapping: Record<string, string>) => void;
};

const AircraftCsvMapping = ({ csvHeaders, csvFirstRow, onMappingChange }: Props) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleMappingChange = (fieldName: string, csvColumn: string) => {
    const newMapping = { ...mapping, [fieldName]: csvColumn };
    setMapping(newMapping);
    onMappingChange(newMapping);
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <h3 className="text-amber-800 font-medium mb-2">Instructions</h3>
        <p className="text-amber-700 text-sm">
          Pour chaque champ requis, sélectionnez la colonne correspondante de votre fichier CSV.
          Les champs marqués d'un astérisque (*) sont obligatoires.
        </p>
      </div>

      {/* Affichage des colonnes disponibles */}
      {csvHeaders.length > 0 && csvFirstRow?.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-lg mb-4">
          <h4 className="text-sm font-medium text-slate-700 mb-2">Colonnes disponibles dans votre CSV :</h4>
          <div className="flex flex-wrap gap-2">
            {csvHeaders.map((header, index) => (
              <div key={header} className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-slate-200 text-sm">
                <span className="text-slate-600">{header}</span>
                {csvFirstRow[index] && (
                  <span className="ml-2 text-xs text-slate-400">
                    ex: {csvFirstRow[index]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Champ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Format Attendu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Exemple Attendu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Colonne CSV
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Exemple de vos données
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {AIRCRAFT_FIELDS.map((field) => (
              <tr key={field.fieldName} className={mapping[field.fieldName] ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {field.fieldName} {field.required && <span className="text-red-500">*</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {field.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {field.format}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {field.example}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  <select
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={mapping[field.fieldName] || ''}
                    onChange={(e) => handleMappingChange(field.fieldName, e.target.value)}
                  >
                    <option value="">Sélectionner une colonne</option>
                    {csvHeaders.map((header, index) => (
                      <option key={header} value={header}>
                        {header}
                        {csvFirstRow?.[index] && ` (ex: ${csvFirstRow[index]})`}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                  {mapping[field.fieldName] && csvFirstRow && (
                    <span className="font-mono bg-slate-100 px-2 py-1 rounded">
                      {csvFirstRow[csvHeaders.indexOf(mapping[field.fieldName])]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AircraftCsvMapping;
