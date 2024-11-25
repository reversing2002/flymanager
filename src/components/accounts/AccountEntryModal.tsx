import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import type {
  AccountEntry,
  AccountEntryType,
  NewAccountEntry,
  PaymentMethod,
  User,
} from "../../types/database";
import {
  updateAccountEntry,
  createAccountEntry,
  deleteAccountEntry,
  getUsers,
} from "../../lib/queries";
import { useAuth } from "../../contexts/AuthContext";
import { dateUtils } from "../../lib/utils/dateUtils";

interface AccountEntryModalProps {
  entry?: AccountEntry;
  onClose: () => void;
  onUpdate: () => void;
}

const AccountEntryModal: React.FC<AccountEntryModalProps> = ({
  entry,
  onClose,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const isAdmin = user?.role === "ADMIN";

  const [formData, setFormData] = useState<NewAccountEntry>({
    userId: entry?.user_id || user?.id || "",
    assignedToId: entry?.assigned_to_id || user?.id || "",
    date: entry?.date
      ? dateUtils.toLocalDateTime(entry.date)
      : dateUtils.toLocalDateTime(new Date().toISOString()),
    type: entry?.type || "ACCOUNT_FUNDING",
    amount: entry?.amount || 0,
    payment_method: entry?.payment_method || "CASH",
    description: entry?.description || "",
    is_validated: entry?.is_validated || false,
  });

  useEffect(() => {
    const loadUsers = async () => {
      if (!isAdmin) return;
      try {
        const loadedUsers = await getUsers();
        setUsers(loadedUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    loadUsers();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const dataToSubmit = {
        ...formData,
        date: dateUtils.toUTCDateTime(formData.date),
      };

      if (entry) {
        if (!isAdmin) {
          setError("Seuls les administrateurs peuvent modifier les entrées");
          return;
        }
        await updateAccountEntry(entry.id, dataToSubmit);
      } else {
        await createAccountEntry(dataToSubmit, isAdmin);
      }
      onUpdate();
      onClose();
    } catch (err) {
      console.error("Error saving entry:", err);
      setError("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entry || !isAdmin) return;

    if (!confirm("Êtes-vous sûr de vouloir supprimer cette opération ?"))
      return;

    setLoading(true);
    setError(null);

    try {
      await deleteAccountEntry(entry.id);
      onUpdate();
      onClose();
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError("Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: AccountEntryType): string => {
    const labels: Record<AccountEntryType, string> = {
      SUBSCRIPTION: "Cotisation",
      MEMBERSHIP: "Adhésion",
      FLIGHT: "Vol",
      INSTRUCTION: "Instruction",
      FUEL: "Carburant",
      MAINTENANCE: "Maintenance",
      INSURANCE: "Assurance",
      FFA: "FFA",
      ACCOUNT_FUNDING: "Approvisionnement",
      OTHER: "Autre",
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {entry ? "Modifier l'opération" : "Nouvelle opération"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date et heure
              </label>
              <input
                type="datetime-local"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full rounded-lg border-slate-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as AccountEntryType,
                  })
                }
                className="w-full rounded-lg border-slate-200"
                required
              >
                <option value="ACCOUNT_FUNDING">Approvisionnement</option>
                <option value="SUBSCRIPTION">Cotisation</option>
                <option value="MEMBERSHIP">Adhésion</option>
                <option value="FLIGHT">Vol</option>
                <option value="INSTRUCTION">Instruction</option>
                <option value="FUEL">Carburant</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INSURANCE">Assurance</option>
                <option value="FFA">FFA</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Montant
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: Number(e.target.value) })
                }
                className="w-full rounded-lg border-slate-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mode de paiement
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_method: e.target.value as PaymentMethod,
                  })
                }
                className="w-full rounded-lg border-slate-200"
                required
              >
                <option value="ACCOUNT">Compte</option>
                <option value="CARD">Carte</option>
                <option value="CASH">Espèces</option>
                <option value="TRANSFER">Virement</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full rounded-lg border-slate-200"
                required
              />
            </div>

            {isAdmin && (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Membre affecté
                  </label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedToId: e.target.value })
                    }
                    className="w-full rounded-lg border-slate-200"
                  >
                    <option value="">Non affecté</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.lastName} {user.firstName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_validated}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_validated: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Transaction vérifiée
                    </span>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between pt-6 border-t">
            {isAdmin && entry && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Suppression..." : "Supprimer"}
              </button>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountEntryModal;