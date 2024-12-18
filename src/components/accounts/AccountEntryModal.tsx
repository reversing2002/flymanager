import React, { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";
import type { AccountEntry, PaymentMethod, User, Flight } from "../../types/database";
import type { AccountEntryType } from "../../types/accounts";
import {
  updateAccountEntry,
  createAccountEntry,
  deleteAccountEntry,
  getUsers,
} from "../../lib/queries";
import { getAccountEntryTypes } from "../../lib/queries/accountTypes";
import { useAuth } from "../../contexts/AuthContext";
import { dateUtils } from "../../lib/utils/dateUtils";
import { hasAnyGroup } from "../../lib/permissions";

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
  const [accountTypes, setAccountTypes] = useState<AccountEntryType[]>([]);
  const isAdmin = hasAnyGroup(user, ["ADMIN"]);

  // Vérifie si l'utilisateur peut modifier cette transaction
  const canEdit = isAdmin || (
    entry && 
    !entry.is_validated && 
    entry.user_id === user?.id && 
    !entry.flight_id // Pas lié à un vol
  );

  // Vérifie si l'utilisateur peut supprimer cette transaction
  const canDelete = isAdmin || (
    entry && 
    !entry.is_validated && 
    entry.user_id === user?.id && 
    !entry.flight_id // Pas lié à un vol
  );

  const [formData, setFormData] = useState<Partial<AccountEntry>>({
    user_id: entry?.user_id || user?.id || "",
    assigned_to_id: entry?.assigned_to_id || user?.id || "",
    date: entry?.date
      ? dateUtils.toLocalDateTime(entry.date)
      : dateUtils.toLocalDateTime(new Date().toISOString()),
    entry_type_id: entry?.entry_type_id || "",
    amount: entry?.amount || 0,
    payment_method: entry?.payment_method || "ACCOUNT",
    description: entry?.description || "",
    is_validated: entry?.is_validated || false,
    is_club_paid: entry?.is_club_paid || false,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!isAdmin) return;
      try {
        const [loadedUsers, loadedTypes] = await Promise.all([
          getUsers(),
          getAccountEntryTypes()
        ]);
        setUsers(loadedUsers);
        setAccountTypes(loadedTypes);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [isAdmin]);

  useEffect(() => {
    const fetchAccountTypes = async () => {
      try {
        const types = await getAccountEntryTypes();
        setAccountTypes(types);
      } catch (error) {
        console.error("Error fetching account types:", error);
      }
    };

    fetchAccountTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const selectedType = accountTypes.find(t => t.id === formData.entry_type_id);
      if (!selectedType) {
        throw new Error("Type de compte invalide");
      }

      // Ajuster le montant selon le type (crédit/débit)
      let amount = Math.abs(formData.amount || 0);
      if (!selectedType.is_credit) {
        amount = -amount;
      }

      const dataToSubmit = {
        user_id: formData.user_id,
        assigned_to_id: formData.assigned_to_id,
        date: dateUtils.toUTCDateTime(formData.date as string),
        entry_type_id: formData.entry_type_id,
        amount: amount,
        payment_method: formData.payment_method,
        description: formData.description,
        is_validated: formData.is_validated,
        is_club_paid: formData.is_club_paid,
      };

      if (entry) {
        if (!canEdit) {
          setError("Seuls les administrateurs ou le propriétaire peuvent modifier les entrées");
          return;
        }
        await updateAccountEntry(entry.id, dataToSubmit);
      } else {
        await createAccountEntry(dataToSubmit);
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
    if (!entry || !canDelete) return;

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

  const createFlightEntries = async (flight: Flight) => {
    // Get the account entry types first
    const { data: entryTypes, error: entryTypesError } = await getAccountEntryTypes();
    if (entryTypesError) {
      console.error("Erreur lors de la récupération des types d'entrées", entryTypesError);
      throw entryTypesError;
    }

    const flightTypeId = entryTypes.find(t => t.code === "FLIGHT")?.id;
    const instructionTypeId = entryTypes.find(t => t.code === "INSTRUCTION")?.id;

    if (!flightTypeId || !instructionTypeId) {
      throw new Error("Types d'entrées comptables non trouvés");
    }

    // Ligne pour le coût de l'avion
    await createAccountEntry({
      user_id: flight.pilotId,
      amount: -flight.cost,
      entry_type_id: flightTypeId,
      flight_id: flight.id,
      description: `Vol du ${new Date(flight.startTime).toLocaleDateString()} - ${flight.duration}h`,
      is_validated: false
    });

    // Ligne pour le coût d'instruction si applicable
    if (flight.instructorId && flight.instructor_cost) {
      await createAccountEntry({
        user_id: flight.pilotId,
        amount: -flight.instructor_cost,
        entry_type_id: instructionTypeId,
        flight_id: flight.id,
        description: `Instruction vol du ${new Date(flight.startTime).toLocaleDateString()} - ${flight.duration}h`,
        is_validated: false
      });
    }
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
              {(canEdit || !entry) ? (
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full rounded-lg border-slate-200"
                  required
                />
              ) : (
                <div className="text-slate-900 py-2">
                  {new Date(formData.date as string).toLocaleString()}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type d'opération
              </label>
              {(canEdit || !entry) ? (
                <select
                  value={formData.entry_type_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      entry_type_id: e.target.value,
                      // Réinitialiser le montant pour éviter les confusions crédit/débit
                      amount: 0
                    })
                  }
                  className="w-full rounded-lg border-slate-200"
                  required
                >
                  <option value="">Sélectionner un type</option>
                  {accountTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.is_credit ? "Crédit" : "Débit"})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-slate-900 py-2">
                  {accountTypes.find(t => t.id === formData.entry_type_id)?.name || "Type inconnu"}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Montant
              </label>
              {(canEdit || !entry) ? (
                <input
                  type="number"
                  step="0.01"
                  value={Math.abs(formData.amount || 0)}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border-slate-200"
                  required
                />
              ) : (
                <div className="text-slate-900 py-2">
                  {Math.abs(formData.amount || 0)} €
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mode de paiement
              </label>
              {(canEdit || !entry) ? (
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
                  <option value="CHEQUE">Chèque</option>
                  <option value="TRANSFER">Virement</option>
                </select>
              ) : (
                <div className="text-slate-900 py-2">
                  {formData.payment_method === "ACCOUNT" && "Compte"}
                  {formData.payment_method === "CARD" && "Carte"}
                  {formData.payment_method === "CASH" && "Espèces"}
                  {formData.payment_method === "CHECK" && "Chèque"}
                  {formData.payment_method === "TRANSFER" && "Virement"}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              {(canEdit || !entry) ? (
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-lg border-slate-200"
                  required
                />
              ) : (
                <div className="text-slate-900 py-2">
                  {formData.description}
                </div>
              )}
            </div>

            {(canEdit || !entry) && (
              <div className="col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_club_paid}
                    onChange={(e) =>
                      setFormData({ ...formData, is_club_paid: e.target.checked })
                    }
                    className="rounded border-slate-300"
                    disabled={!canEdit && entry}
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Payé par le club
                  </span>
                </label>
              </div>
            )}

            {isAdmin && (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Membre affecté
                  </label>
                  <select
                    value={formData.assigned_to_id}
                    onChange={(e) =>
                      setFormData({ ...formData, assigned_to_id: e.target.value })
                    }
                    className="w-full rounded-lg border-slate-200"
                  >
                    <option value="">Non affecté</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.last_name} {user.first_name}
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
            
            {!isAdmin && entry && (
              <div className="col-span-2">
                <div className="text-sm text-slate-600">
                  {formData.is_validated ? (
                    <span className="text-emerald-600">✓ Transaction vérifiée</span>
                  ) : (
                    <span className="text-amber-600">En attente de vérification</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-6 border-t">
            {(isAdmin || canDelete) && entry && (
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
                {(canEdit || !entry) ? "Annuler" : "Fermer"}
              </button>
              {(canEdit || !entry) && (
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountEntryModal;