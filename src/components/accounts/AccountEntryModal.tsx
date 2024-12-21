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
        throw new Error("Type de transaction non valide");
      }

      // Validation spéciale pour la réinitialisation du solde
      if (selectedType.code === 'BALANCE_RESET' && !isAdmin) {
        throw new Error("Seuls les administrateurs peuvent réinitialiser le solde");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>

        <h2 className="mb-4 text-2xl font-bold">
          {entry ? "Modifier la transaction" : "Nouvelle transaction"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdmin && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Utilisateur
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) =>
                    setFormData({ ...formData, user_id: e.target.value })
                  }
                  className="w-full rounded-md border p-2"
                  required
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Assigné à
                </label>
                <select
                  value={formData.assigned_to_id}
                  onChange={(e) =>
                    setFormData({ ...formData, assigned_to_id: e.target.value })
                  }
                  className="w-full rounded-md border p-2"
                  required
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              value={formData.entry_type_id}
              onChange={(e) => {
                const selectedType = accountTypes.find(t => t.id === e.target.value);
                setFormData({ 
                  ...formData, 
                  entry_type_id: e.target.value,
                  payment_method: selectedType?.code === 'BALANCE_RESET' ? 'ACCOUNT' : formData.payment_method
                });
              }}
              className="w-full rounded-md border p-2"
              required
              disabled={!isAdmin && entry?.is_validated}
            >
              <option value="">Sélectionner un type</option>
              {accountTypes
                .filter(type => isAdmin || (type.code !== 'BALANCE_RESET'))
                .map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="datetime-local"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full rounded-md border p-2"
              required
              disabled={!isAdmin && entry?.is_validated}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Montant</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseFloat(e.target.value) })
              }
              className="w-full rounded-md border p-2"
              required
              disabled={!isAdmin && entry?.is_validated}
            />
          </div>

          {!accountTypes.find(t => t.id === formData.entry_type_id)?.code?.includes('BALANCE_RESET') && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Méthode de paiement
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payment_method: e.target.value as PaymentMethod,
                  })
                }
                className="w-full rounded-md border p-2"
                required
                disabled={!isAdmin && entry?.is_validated}
              >
                <option value="ACCOUNT">Compte</option>
                <option value="CASH">Espèces</option>
                <option value="CHECK">Chèque</option>
                <option value="CARD">Carte</option>
                <option value="TRANSFER">Virement</option>
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full rounded-md border p-2"
              rows={3}
              disabled={!isAdmin && entry?.is_validated}
            />
          </div>

          {isAdmin && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_validated}
                onChange={(e) =>
                  setFormData({ ...formData, is_validated: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
                id="validated"
              />
              <label htmlFor="validated" className="text-sm">
                Transaction validée
              </label>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 rounded-md bg-red-50 p-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            {canDelete && entry && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                disabled={loading}
              >
                Supprimer
              </button>
            )}
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              disabled={loading || (!isAdmin && entry?.is_validated)}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountEntryModal;