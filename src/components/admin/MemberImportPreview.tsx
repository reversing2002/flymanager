import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getRoleLabel } from "../../lib/utils/roleUtils";

interface PreviewData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  licenseNumber: string;
  licenseExpiry: string;
  medicalExpiry: string;
  birthDate: string;
  address_1: string;
  city: string;
  zip_code: string;
  country: string;
  registrationDate: string;
  login: string;
}

interface MemberImportPreviewProps {
  data: PreviewData[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const MemberImportPreview: React.FC<MemberImportPreviewProps> = ({
  data,
  onConfirm,
  onCancel,
  loading = false,
}) => {

  const formatDate = (date: string) => {
    return date && format(new Date(date), "dd/MM/yyyy", { locale: fr });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">
        Prévisualisation de l'import
      </h3>
      <p className="text-sm text-slate-600 mb-4">
        Vérifiez que les données sont correctement mappées avant de confirmer
        l'import.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2">Nom</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Téléphone</th>
              <th className="text-left p-2">Rôle</th>
              <th className="text-left p-2">Login</th>
              <th className="text-left p-2">Date de naissance</th>
              <th className="text-left p-2">Date d'inscription</th>
              <th className="text-left p-2">Adresse</th>
              <th className="text-left p-2">Ville</th>
              <th className="text-left p-2">CP</th>
              <th className="text-left p-2">Pays</th>
              <th className="text-left p-2">Licence</th>
              <th className="text-left p-2">Validité licence</th>
              <th className="text-left p-2">Validité médicale</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="p-2">
                  {row.firstName} {row.lastName}
                </td>
                <td className="p-2">{row.email}</td>
                <td className="p-2">{row.phone}</td>
                <td className="p-2">{getRoleLabel(row.role)}</td>
                <td className="p-2">{row.login}</td>
                <td className="p-2">{formatDate(row.birthDate)}</td>
                <td className="p-2">{formatDate(row.registrationDate)}</td>
                <td className="p-2">{row.address_1}</td>
                <td className="p-2">{row.city}</td>
                <td className="p-2">{row.zip_code}</td>
                <td className="p-2">{row.country}</td>
                <td className="p-2">{row.licenseNumber}</td>
                <td className="p-2">{formatDate(row.licenseExpiry)}</td>
                <td className="p-2">{formatDate(row.medicalExpiry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end space-x-4 mt-6 pt-6 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Import en cours..." : "Confirmer l'import"}
        </button>
      </div>
    </div>
  );
};

export default MemberImportPreview;
