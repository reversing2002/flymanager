import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PreviewData {
  date: string;
  userName: string;
  amount: number;
  paymentMethod: string;
  description: string;
  balance: number;
  previousBalance: number;
  type: string;
}

interface AccountImportPreviewProps {
  data: PreviewData[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const AccountImportPreview: React.FC<AccountImportPreviewProps> = ({
  data,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      signDisplay: "always",
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method.toUpperCase()) {
      case "COMPTE":
        return "Compte";
      case "CARTE BANCAIRE":
        return "Carte";
      case "ESPECE":
        return "Espèces";
      case "VIREMENT":
      case "NON":
        return "Virement";
      case "CHEQUE":
        return "Chèque";
      default:
        return method;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "FLIGHT":
        return "Vol";
      case "SUBSCRIPTION":
        return "Cotisation";
      case "MEMBERSHIP":
        return "Adhésion";
      case "INSTRUCTION":
        return "Instruction";
      case "FUEL":
        return "Essence";
      case "ACCOUNT_FUNDING":
        return "Approvisionnement";
      case "TRANSFER":
        return "Virement";
      case "REFUND":
        return "Remboursement";
      default:
        return "Autre";
    }
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
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">Membre</th>
              <th className="text-right p-2">Montant</th>
              <th className="text-right p-2">Solde</th>
              <th className="text-right p-2">Solde précédent</th>
              <th className="text-left p-2">Mode</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Description</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="border-t border-slate-100">
                <td className="p-2">
                  {format(new Date(row.date), "dd/MM/yyyy", { locale: fr })}
                </td>
                <td className="p-2">{row.userName}</td>
                <td
                  className={`p-2 text-right font-medium ${
                    row.amount >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatAmount(row.amount)}
                </td>
                <td className="p-2 text-right">{formatAmount(row.balance)}</td>
                <td className="p-2 text-right">
                  {formatAmount(row.previousBalance)}
                </td>
                <td className="p-2">
                  {getPaymentMethodLabel(row.paymentMethod)}
                </td>
                <td className="p-2">{getTypeLabel(row.type)}</td>
                <td className="p-2 max-w-md truncate">{row.description}</td>
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

export default AccountImportPreview;
