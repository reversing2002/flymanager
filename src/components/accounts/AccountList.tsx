import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  Filter,
  Download,
  Plus,
  CheckCircle2,
  CreditCard,
  Pencil,
  Trash2,
} from "lucide-react";
import type { AccountEntry, User } from "../../types/database";
import { 
  getAccountEntries, 
  deleteAccountEntry,
  calculateMemberBalance,
  calculatePendingBalance
} from "../../lib/queries/accounts";
import { getUsers } from "../../lib/queries/users";
import AccountEntryModal from "./AccountEntryModal";
import CreditAccountModal from "./CreditAccountModal";
import { useAuth } from "../../contexts/AuthContext";
import { dateUtils } from "../../lib/utils/dateUtils";
import { toast } from "react-hot-toast";
import { hasAnyGroup } from "../../lib/permissions";
import { supabase } from '../../lib/supabase';

const AccountList = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AccountEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AccountEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "all",
    validated: "all",
    assignedToId: "all",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [validatedBalance, setValidatedBalance] = useState<number>(0);
  const [pendingBalance, setPendingBalance] = useState<number>(0);

  const isAdmin = hasAnyGroup(user, ["ADMIN"]);

  useEffect(() => {
    loadEntries();
    const loadUsers = async () => {
      try {
        const loadedUsers = await getUsers();
        setUsers(loadedUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const memberId = params.get("member");
    const success = params.get("success");
    const canceled = params.get("canceled");

    if (memberId) {
      setFilters((prev) => ({
        ...prev,
        assignedToId: memberId,
      }));
      setShowFilters(true);
    }

    if (success) {
      toast.success("Paiement effectué avec succès");
      navigate("/accounts", { replace: true });
      loadEntries();
    }

    if (canceled) {
      toast.error("Paiement annulé");
      navigate("/accounts", { replace: true });
    }
  }, [location.search]);

  useEffect(() => {
    const updateBalances = async () => {
      try {
        const userId = filters.assignedToId === "all" ? user?.id : filters.assignedToId;
        if (!userId) return;

        const currentDate = new Date().toISOString();

        // Calculer les soldes en utilisant la nouvelle fonction RPC
        const { data: balances, error } = await supabase
          .rpc('calculate_pending_balance_from_date', {
            p_user_id: userId,
            p_date: currentDate
          });

        if (error) throw error;
        
        if (balances && balances[0]) {
          setValidatedBalance(balances[0].validated_balance || 0);
          setPendingBalance(balances[0].total_balance || 0);
        }
      } catch (error) {
        console.error("Error calculating balances:", error);
      }
    };

    updateBalances();
  }, [entries, filters.assignedToId, user?.id]);

  const loadEntries = async () => {
    try {
      const data = await getAccountEntries();
      setEntries(data);
    } catch (error) {
      console.error("Error loading account entries:", error);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "ACCOUNT":
        return "Compte";
      case "CARD":
        return "Carte";
      case "CASH":
        return "Espèces";
      case "CHECK":
        return "Chèque";
      case "TRANSFER":
        return "Virement";
      default:
        return method;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "FLIGHT":
        return "Vol";
      case "MEMBERSHIP":
        return "Cotisation";
      case "INSURANCE":
        return "Assurance";
      case "DEPOSIT":
        return "Dépôt";
      case "WITHDRAWAL":
        return "Retrait";
      default:
        return type;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccountEntry(id);
      toast.success('Compte supprimé avec succès.');
      loadEntries(); // Recharge les entrées après suppression
    } catch (error) {
      toast.error('Erreur lors de la suppression du compte.');
    }
  };

  const handleUpdate = (entry: AccountEntry) => {
    setSelectedEntry(entry);
    setShowEditModal(true); // Utilise la modal de modification
  };

  const renderTable = () => {
    const filteredEntries = entries.filter((entry) => {
      if (filters.startDate && new Date(entry.date) < new Date(filters.startDate))
        return false;
      if (filters.endDate && new Date(entry.date) > new Date(filters.endDate))
        return false;
      if (
        filters.validated !== "all" &&
        entry.is_validated !== (filters.validated === "true")
      )
        return false;
      if (filters.assignedToId !== "all" && entry.assigned_to_id !== filters.assignedToId)
        return false;
      return true;
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-3 text-left font-medium text-slate-600">Date</th>
              <th className="py-3 text-left font-medium text-slate-600">Membre</th>
              <th className="py-3 text-left font-medium text-slate-600">Type</th>
              <th className="py-3 text-left font-medium text-slate-600">Description</th>
              <th className="py-3 text-left font-medium text-slate-600">Montant</th>
              <th className="py-3 text-left font-medium text-slate-600">Paiement</th>
              <th className="py-3 text-left font-medium text-slate-600">Validé</th>
              <th className="py-3 text-center font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEntries.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <td className="py-3 text-slate-600">
                  {dateUtils.formatDate(entry.date)}
                </td>
                <td className="py-3 text-slate-600">
                  {getUserName(entry.assigned_to_id)}
                </td>
                
                <td className="py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                    ${entry.account_entry_types?.is_credit 
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'}`}>
                    {entry.account_entry_types?.name || "Type inconnu"}
                  </span>
                </td>
                <td className="py-3 text-slate-600">{entry.description}</td>
                <td className={`py-3 font-medium ${
                  entry.amount >= 0 ? "text-emerald-600" : "text-red-600"
                }`}>
                  <span className={entry.is_club_paid ? "line-through" : ""}>
                    {formatAmount(entry.amount)}
                  </span>
                </td>
                <td className="py-3 text-slate-600">
                  {getPaymentMethodLabel(entry.payment_method)}
                </td>
                <td className="py-3">
                  {entry.is_validated ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5" />
                  )}
                </td>
                <td className="py-3">
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntry(entry);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <Eye className="h-4 w-4 text-slate-500" />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); 
                            handleUpdate(entry);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4 text-slate-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(entry.id);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "-";
    const user = users.find((u) => u.id === userId);
    return user ? `${user.last_name} ${user.first_name}` : "-";
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Lignes de compte
          </h1>
          <p className="text-slate-600">Gestion des opérations financières</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCreditModal(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            <span>Créditer mon compte</span>
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvelle opération</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filtres</span>
          </button>
          <button
            onClick={() => {
              /* TODO: Export functionality */
            }}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters({ ...filters, endDate: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type d'opération
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              >
                <option value="all">Tous</option>
                <option value="FLIGHT">Vols</option>
                <option value="MEMBERSHIP">Cotisations</option>
                <option value="INSURANCE">Assurances</option>
                <option value="DEPOSIT">Dépôts</option>
                <option value="WITHDRAWAL">Retraits</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Validation
              </label>
              <select
                value={filters.validated}
                onChange={(e) =>
                  setFilters({ ...filters, validated: e.target.value })
                }
                className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
              >
                <option value="all">Tous</option>
                <option value="yes">Validés</option>
                <option value="no">Non validés</option>
              </select>
            </div>
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Membre
                </label>
                <select
                  value={filters.assignedToId}
                  onChange={(e) =>
                    setFilters({ ...filters, assignedToId: e.target.value })
                  }
                  className="w-full rounded-lg border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                >
                  <option value="all">Tous</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.last_name} {user.first_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Solde validé
                </h2>
                <p
                  className={`text-2xl font-bold ${
                    validatedBalance >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {formatAmount(validatedBalance)}
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Solde en attente
                </h2>
                <p className="text-2xl font-bold text-amber-600">
                  {formatAmount(pendingBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {renderTable()}
      </div>

      {(selectedEntry || isCreating) && (
        <AccountEntryModal
          entry={selectedEntry}
          onClose={() => {
            setSelectedEntry(null);
            setIsCreating(false);
          }}
          onUpdate={loadEntries}
        />
      )}

      {showEditModal && selectedEntry && (
        <AccountEntryModal
          entry={selectedEntry}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEntry(null);
          }}
          onUpdate={() => {
            loadEntries();
            setShowEditModal(false);
            setSelectedEntry(null);
          }}
        />
      )}

      {showCreditModal && user && (
        <CreditAccountModal
          userId={user.id}
          onClose={() => setShowCreditModal(false)}
          onSuccess={loadEntries}
        />
      )}
    </div>
  );
};

export default AccountList;
