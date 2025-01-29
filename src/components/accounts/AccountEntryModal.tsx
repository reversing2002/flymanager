import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Upload } from "lucide-react";
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
import { supabase } from "../../lib/supabase";
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

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
  const isAdmin = hasAnyGroup(user, ["ADMIN", "TREASURER", "INSTRUCTOR"]);

  // Fonction utilitaire pour formater la date
  const formatDateForInput = (dateString: string | null | undefined): string => {
    console.log('Date reçue:', dateString);
    if (!dateString) {
      console.log('Pas de date, utilisation de la date actuelle');
      return format(new Date(), 'yyyy-MM-dd');
    }
    try {
      // Utiliser date-fns pour parser et formater la date
      const date = parseISO(dateString);
      const formattedDate = format(date, 'yyyy-MM-dd');
      console.log('Date formatée:', formattedDate);
      return formattedDate;
    } catch (error) {
      console.error('Erreur de formatage de la date:', error);
      return format(new Date(), 'yyyy-MM-dd');
    }
  };

  // Log pour voir les données d'entrée
  useEffect(() => {
    if (entry) {
      console.log('Entry reçu:', entry);
      console.log('Date de entry:', entry.date);
      // Mettre à jour le formData quand l'entrée change
      setFormData(prev => ({
        ...prev,
        user_id: entry.user_id,
        assigned_to_id: entry.assigned_to_id,
        date: formatDateForInput(entry.date),
        amount: entry.amount,
        description: entry.description,
        payment_method: entry.payment_method,
        entry_type_id: entry.entry_type_id,
        is_validated: entry.is_validated,
        attachment_url: entry.attachment_url || "",
        attachment_type: entry.attachment_type || null
      }));
    }
  }, [entry]);

  const [formData, setFormData] = useState<Partial<AccountEntry>>({
    user_id: user?.id || "",
    assigned_to_id: user?.id || "",
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: "",
    description: "",
    payment_method: "ACCOUNT",
    entry_type_id: "",
    is_validated: false,
    attachment_url: "",
    attachment_type: null
  });

  const [file, setFile] = useState<File | null>(null);

  // Fonction pour déterminer le type de fichier
  const getFileType = (mimeType: string): 'image' | 'pdf' | null => {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType === 'application/pdf') {
      return 'pdf';
    }
    return null;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const types = await getAccountEntryTypes();
        setAccountTypes(types);
        
        if (!isAdmin && !entry) {  // Seulement pour les nouvelles entrées
          const refundType = types.find(type => type.code === 'REFUND');
          if (!refundType) {
            setError("Type de remboursement non configuré");
            return;
          }
          setFormData(prev => ({
            ...prev,
            entry_type_id: refundType.id,
            payment_method: "ACCOUNT"
          }));
        }
        
        if (isAdmin) {
          const loadedUsers = await getUsers();
          setUsers(loadedUsers);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Erreur lors du chargement des données");
      }
    };
    loadData();
  }, [isAdmin, user?.id, entry]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setFormData(prev => ({
          ...prev,
          attachment_type: getFileType(selectedFile.type)
        }));
      } else {
        setError("Le fichier doit être une image ou un PDF");
      }
    }
  };

  const uploadFile = async () => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `justificatifs/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let attachmentUrl = formData.attachment_url;

      if (file) {
        attachmentUrl = await uploadFile();
      }

      // Pour les non-admin, on force le type REFUND
      if (!isAdmin) {
        const refundType = accountTypes.find(type => type.code === 'REFUND');
        if (!refundType) {
          throw new Error("Type de remboursement non configuré");
        }
        formData.entry_type_id = refundType.id;
      }

      const selectedType = accountTypes.find(t => t.id === formData.entry_type_id);
      if (!selectedType) {
        throw new Error("Type de transaction non valide");
      }

      // Préparer les données pour l'enregistrement
      const entryData: Partial<AccountEntry> = {
        ...formData,
        // Conserver l'utilisateur original en édition, utiliser la valeur du formulaire en création
        user_id: entry ? formData.user_id : formData.user_id,
        assigned_to_id: formData.assigned_to_id,
        amount: (formData.amount || 0),
        attachment_url: attachmentUrl || formData.attachment_url,
        attachment_type: file ? getFileType(file.type) : formData.attachment_type,
        payment_method: formData.payment_method || "ACCOUNT",
        is_validated: false
      };

      if (entry?.id) {
        await updateAccountEntry(entry.id, entryData);
      } else {
        await createAccountEntry(entryData);
      }

      onUpdate();
      onClose();
      toast.success("Opération enregistrée avec succès");
    } catch (error) {
      console.error("Error saving entry:", error);
      // Vérifier si c'est une erreur Supabase spécifique
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P0001') {
        setError(error.message || "Le montant ne correspond pas au type d'opération (crédit/débit)");
      } else {
        setError(error instanceof Error ? error.message : "Une erreur est survenue");
      }
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

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>

          <h2 className="mb-6 text-xl font-semibold">
            {entry ? "Modifier la dépense" : "Nouvelle dépense"}
          </h2>

          {error && (
            <div className="mb-4 flex items-center rounded-md bg-red-50 p-4 text-red-800">
              <AlertTriangle className="mr-2 h-5 w-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date || format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  const newDate = e.target.value;
                  console.log('Nouvelle date sélectionnée:', newDate);
                  setFormData(prev => ({
                    ...prev,
                    date: newDate
                  }));
                }}
                className="w-full rounded-md border p-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-md border p-2"
                required
                rows={3}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Montant (€)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="w-full rounded-md border p-2"
                required
                step="0.01"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Justificatif</label>
              <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500">
                      <span>Télécharger un fichier</span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={handleFileChange}
                        accept=".pdf,.png,.jpg,.jpeg"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF jusqu'à 10MB</p>
                </div>
              </div>
              {file && (
                <p className="mt-2 text-sm text-gray-500">
                  Fichier sélectionné: {file.name}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "En cours..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
                  {users
                    .sort((a, b) => {
                      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
                      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.last_name} {u.first_name}
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
                  {users
                    .sort((a, b) => {
                      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase();
                      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase();
                      return nameA.localeCompare(nameB);
                    })
                    .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.last_name} {u.first_name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Type de transaction - caché pour les non-admin car fixé à REFUND */}
          {isAdmin && (
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
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date || format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => {
                const newDate = e.target.value;
                console.log('Nouvelle date sélectionnée:', newDate);
                setFormData(prev => ({
                  ...prev,
                  date: newDate
                }));
              }}
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

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Pièce justificative
            </label>
            <div className="mt-1 flex items-center">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Upload className="h-5 w-5 mr-2" />
                {file ? file.name : "Choisir un fichier"}
              </label>
              {formData.attachment_url && !file && (
                <a
                  href={formData.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  Voir le justificatif actuel
                </a>
              )}
            </div>
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