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
  Check,
  FileText
} from "lucide-react";
import type { AccountEntry, User } from "../../types/database";
import { 
  getAccountEntries, 
  deleteAccountEntry,
  calculateMemberBalance,
  calculatePendingBalance,
  validateAccountEntry
} from "../../lib/queries/accounts";
import { getUsers } from "../../lib/queries/users";
import AccountEntryModal from "./AccountEntryModal";
import CreditAccountModal from "./CreditAccountModal";
import SimpleCreditModal from "./SimpleCreditModal"; // Importer le nouveau composant
import { useAuth } from "../../contexts/AuthContext";
import { dateUtils } from "../../lib/utils/dateUtils";
import { toast } from "react-hot-toast";
import { hasAnyGroup } from "../../lib/permissions";
import { supabase } from '../../lib/supabase';
import { useBackups } from '@/hooks/useBackups';
import { useQuery } from "@tanstack/react-query";

const AccountList = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState<AccountEntry | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    type: "all",
    validated: "all",
    assignedToId: "all",
  });
  const [searchTerm, setSearchTerm] = useState("");

  // Types pour les soldes
  interface BalanceData {
    validated_balance: number;
    pending_amount: number;
    total_balance: number;
  }

  const isAdmin = hasAnyGroup(user, ["ADMIN"]);

  const { useCreateBackup } = useBackups();
  const { mutate: createBackup } = useCreateBackup();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const loadedUsers = await getUsers();
        setUsers(loadedUsers);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    if (isAdmin) loadUsers();
  }, [isAdmin]);

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
    }

    if (canceled) {
      toast.error("Paiement annulé");
      navigate("/accounts", { replace: true });
    }
  }, [location.search]);

  // Requête pour les entrées de compte
  const { data: entriesData, isLoading: entriesLoading, refetch: refetchEntries } = useQuery({
    queryKey: ["accounts", currentPage, pageSize, filters],
    queryFn: () => getAccountEntries(currentPage, pageSize, filters),
    enabled: true,
    refetchOnWindowFocus: false,
  });

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ["balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const nextDay = new Date();
      nextDay.setDate(nextDay.getDate() + 1);
  
      const { data, error } = await supabase
        .rpc('calculate_pending_balance_from_date', {
          p_user_id: user.id,
          p_date: nextDay.toISOString()
        });
  
      if (error) {
        console.error("Erreur lors du calcul des soldes:", error);
        throw error;
      }
  
      console.log("Données de solde reçues:", data);
      return data?.[0] || null;
    },
    enabled: !!user?.id && !isAdmin,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  console.log("Balance utilisée pour l'affichage:", balanceData);

  const entries = entriesData?.data || [];
  const balance = balanceData || { validated_balance: 0, pending_amount: 0, total_balance: 0 };

  useEffect(() => {
    if (entriesData) {
      setTotalEntries(entriesData.count);
    }
  }, [entriesData]);

  // Fonction pour formater les montants en euros
  const formatAmount = (amount: number): string => {
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
    case "REFUND":
        return "Remboursement";
    default:
        return type;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) return;
    
    try {
      const { error } = await supabase
        .from("account_entries")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Entrée supprimée avec succès");
      refetchEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Erreur lors de la suppression de l'entrée");
    }
  };

  const handleEdit = (entry: AccountEntry) => {
    setSelectedEntry(entry);
    setShowEditModal(true);
  };

  const handleValidateEntry = async (entry: AccountEntry) => {
    try {
      await validateAccountEntry(entry.id);
      toast.success("Entrée validée avec succès");
      refetchEntries();
    } catch (error) {
      console.error("Error validating entry:", error);
      toast.error("Erreur lors de la validation de l'entrée");
    }
  };

  const handleViewAttachment = (entry: AccountEntry) => {
    if (entry.attachment_url) {
      window.open(entry.attachment_url, '_blank');
    } else {
      toast.error("Aucun justificatif disponible");
    }
  };

  const renderTable = () => {
    const filteredEntries = entries.filter((entry) => {
      // Filtre par date de début
      if (filters.startDate && new Date(entry.date) < new Date(filters.startDate))
        return false;
      
      // Filtre par date de fin
      if (filters.endDate && new Date(entry.date) > new Date(filters.endDate))
        return false;
      
      // Filtre par statut de validation
      if (
        filters.validated !== "all" &&
        entry.is_validated !== (filters.validated === "true")
      )
        return false;
      
      // Filtre par membre assigné
      if (filters.assignedToId !== "all" && entry.assigned_to_id !== filters.assignedToId)
        return false;
        
      // Filtre par type d'opération
      if (filters.type !== "all" && entry.account_entry_types?.code !== filters.type)
        return false;
        
      return true;
    });

    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-4 sm:space-y-0 relative pb-16">
          <h1 className="text-xl sm:text-2xl font-bold">Gestion des comptes</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <select
              className="border rounded-md px-2 py-1.5 sm:px-3 sm:py-2 bg-white text-sm flex-grow sm:flex-grow-0"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="50">50 par page</option>
              <option value="100">100 par page</option>
              <option value="500">500 par page</option>
              <option value="1000">1000 par page</option> 
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm w-full sm:w-auto justify-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              <span>Filtres</span>
            </button>
            {showFilters && (
              <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <select
                      value={filters.validated}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, validated: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="all">Tous</option>
                      <option value="true">Validés</option>
                      <option value="false">Non validés</option>
                    </select>
                  </div>
                  {isAdmin && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rechercher un membre
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Rechercher..."
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Membre
                        </label>
                        <select
                          value={filters.assignedToId}
                          onChange={(e) =>
                            setFilters((prev) => ({ ...prev, assignedToId: e.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="all">Tous</option>
                          {users
                            .filter(user => 
                              searchTerm === "" || 
                              `${user.last_name} ${user.first_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .sort((a, b) => a.last_name.localeCompare(b.last_name))
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.last_name} {user.first_name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type d'opération
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, type: e.target.value }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="all">Tous</option>
                      <option value="SUBSCRIPTION">Cotisation</option>
                      <option value="MEMBERSHIP">Adhésion</option>
                      <option value="FLIGHT">Vol</option>
                      <option value="INSTRUCTION">Instruction</option>
                      <option value="FUEL">Essence</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="INSURANCE">Assurance</option>
                      <option value="FFA">FFA</option>
                      <option value="ACCOUNT_FUNDING">Approvisionnement compte</option>
                      <option value="REFUND">Remboursement</option>
                      <option value="OTHER">Autre</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {
                      setFilters({
                        startDate: "",
                        endDate: "",
                        type: "all",
                        validated: "all",
                        assignedToId: "all",
                      });
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              </div>
            )}
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors w-full sm:w-auto justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              <span>Exporter</span>
            </button>
            {isAdmin ? (
              <div className="hidden sm:block">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors w-full sm:w-auto justify-center"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nouvelle opération</span>
                </button>
              </div>
            ) : user && (
              <div className="hidden sm:block">
                <button
                  onClick={() => setShowCreditModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors w-full sm:w-auto justify-center"
                >
                  <Plus className="h-4 w-4" />
                  <span>Créditer mon compte</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Soldes de l'utilisateur connecté */}
        {!isAdmin && user && balanceData && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Solde validé</h3>
              <p className="text-3xl font-bold text-primary-600">
                {formatAmount(balanceData.validated_balance)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">En attente de validation</h3>
              <p className="text-3xl font-bold text-orange-500">
                {formatAmount(balanceData.pending_amount)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Solde futur</h3>
              <p className={`text-3xl font-bold ${balanceData.total_balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatAmount(balanceData.total_balance)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                (après validation)
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-4 sm:space-y-0 relative pb-16">
          <div className="flex space-x-2">

            {!isAdmin && (
              <button
                onClick={() => {
                  setSelectedEntry(undefined);
                  setIsCreating(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Plus className="h-5 w-5 mr-2" />
                <span>Nouvelle dépense club</span>
              </button>
            )}
          </div>
          
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-x-auto sm:hidden">
          {filteredEntries.map((entry) => {
            const assignedUser = users.find(u => u.id === entry.assigned_to_id);
            return (
              <div key={entry.id} className="p-4 border-b last:border-b-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-900">
                      {entry.account_entry_types?.name || "-"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {assignedUser ? `${assignedUser.first_name} ${assignedUser.last_name}` : "-"}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${
                    entry.account_entry_types?.is_credit ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatAmount(entry.amount)}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  <p>{entry.description || "-"}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(entry.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-end space-x-2">
                  {entry.attachment_url && (
                    <button
                      onClick={() => handleViewAttachment(entry)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Voir le justificatif"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  )}
                  {entry.is_validated ? (
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className="text-slate-400 hover:text-slate-600"
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-blue-400 hover:text-blue-600"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-x-auto hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-4 font-medium text-slate-600">Date</th>
                <th className="text-left p-4 font-medium text-slate-600">Membre</th>
                <th className="text-left p-4 font-medium text-slate-600">Type</th>
                <th className="text-left p-4 font-medium text-slate-600 hidden sm:table-cell">Description</th>
                <th className="text-right p-4 font-medium text-slate-600">Montant</th>
                <th className="text-center p-4 font-medium text-slate-600 hidden sm:table-cell">Validé</th>
                <th className="text-center p-4 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const assignedUser = users.find(
                  (u) => u.id === entry.assigned_to_id
                );
                return (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-4 whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {assignedUser ? (
                        <button
                          onClick={() => navigate(`/members/${assignedUser.id}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {assignedUser.first_name} {assignedUser.last_name}
                        </button>
                      ) : "-"}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${entry.account_entry_types?.is_credit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {entry.account_entry_types?.name || "-"}
                      </span>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      {entry.description || "-"}
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <span className={entry.account_entry_types?.is_credit ? 'text-green-600' : 'text-red-600'}>
                        {formatAmount(entry.amount)}
                      </span>
                    </td>
                    <td className="p-4 text-center hidden sm:table-cell">
                      {entry.is_validated ? (
                        <span className="text-green-600" title="Entrée validée">
                          <CheckCircle2 className="h-5 w-5 mx-auto" />
                        </span>
                      ) : isAdmin ? (
                        <button
                          onClick={() => handleValidateEntry(entry)}
                          className="text-green-600 hover:text-green-800"
                          title="Valider"
                        >
                          <Check className="h-5 w-5 mx-auto" />
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {entry.attachment_url && (
                          <button
                            onClick={() => handleViewAttachment(entry)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Voir le justificatif"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        {entry.is_validated ? (
                          <button
                            onClick={() => setSelectedEntry(entry)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => handleEdit(entry)}
                                  className="text-blue-400 hover:text-blue-600"
                                  title="Modifier"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="text-red-400 hover:text-red-600"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            ) : entry.account_entry_types?.code === 'ACCOUNT_FUNDING' && entry.user_id === user?.id && (
                              <>
                                <button
                                  onClick={() => handleEdit(entry)}
                                  className="text-blue-400 hover:text-blue-600"
                                  title="Modifier"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="text-red-400 hover:text-red-600"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination mobile-friendly */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
          <div className="text-sm text-gray-700">
            Affichage de {Math.min((currentPage - 1) * pageSize + 1, totalEntries)} à{" "}
            {Math.min(currentPage * pageSize, totalEntries)} sur {totalEntries} entrées
          </div>
          <div className="flex justify-center items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="px-3 py-1">
              Page {currentPage} sur {Math.ceil(totalEntries / pageSize)}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= Math.ceil(totalEntries / pageSize)}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "-";
    const user = users.find((u) => u.id === userId);
    return user ? `${user.last_name} ${user.first_name}` : "-";
  };

  const handleExport = () => {
    // Préparer les données filtrées pour l'export
    const dataToExport = entries.filter((entry) => {
      // Filtre par date de début
      if (filters.startDate && new Date(entry.date) < new Date(filters.startDate))
        return false;
      
      // Filtre par date de fin
      if (filters.endDate && new Date(entry.date) > new Date(filters.endDate))
        return false;
      
      // Filtre par statut de validation
      if (
        filters.validated !== "all" &&
        entry.is_validated !== (filters.validated === "true")
      )
        return false;
      
      // Filtre par membre assigné
      if (filters.assignedToId !== "all" && entry.assigned_to_id !== filters.assignedToId)
        return false;
        
      // Filtre par type d'opération
      if (filters.type !== "all" && entry.account_entry_types?.code !== filters.type)
        return false;
        
      return true;
    }).map((entry) => ({
      Date: dateUtils.formatDate(entry.date),
      Membre: getUserName(entry.assigned_to_id),
      Type: entry.account_entry_types?.name || "Type inconnu",
      Description: entry.description,
      Montant: formatAmount(entry.amount),
      "Méthode de paiement": getPaymentMethodLabel(entry.payment_method),
      "Validé": entry.is_validated ? "Oui" : "Non",
      "Payé au club": entry.is_club_paid ? "Oui" : "Non"
    }));

    // Convertir en CSV
    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(";"),
      ...dataToExport.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Échapper les guillemets et ajouter des guillemets si nécessaire
          const formattedValue = value?.toString().includes(";") 
            ? `"${value.toString().replace(/"/g, '""')}"` 
            : value;
          return formattedValue;
        }).join(";")
      )
    ].join("\n");

    // Créer et télécharger le fichier
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `export_comptes_${dateUtils.formatDate(new Date().toISOString())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Export réussi !");
  };

  return (
    <>
      {renderTable()}

      {/* Bouton flottant pour mobile */}
      {isAdmin ? (
        <div className="fixed bottom-4 right-4 sm:hidden z-50">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-lg transition-all active:scale-95"
            aria-label="Créer une nouvelle opération"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 sm:hidden z-50">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-lg transition-all active:scale-95"
            aria-label="Nouvelle dépense club"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}
      
      {/* Modales */}
      {(selectedEntry || isCreating) && !showEditModal && (
        <AccountEntryModal
          entry={selectedEntry}
          onClose={() => {
            setSelectedEntry(undefined);
            setIsCreating(false);
          }}
          onUpdate={refetchEntries}
        />
      )}

      {showEditModal && selectedEntry && (
        isAdmin ? (
          <AccountEntryModal
            entry={selectedEntry}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEntry(null);
            }}
            onUpdate={() => {
              refetchEntries();
              setShowEditModal(false);
              setSelectedEntry(null);
            }}
          />
        ) : (
          <SimpleCreditModal
            userId={user?.id || ""}
            entry={selectedEntry}
            onClose={() => {
              setShowEditModal(false);
              setSelectedEntry(null);
            }}
            onSuccess={() => {
              refetchEntries();
              setShowEditModal(false);
              setSelectedEntry(null);
            }}
          />
        )
      )}

      {showCreditModal && user && (isAdmin ? (
        <CreditAccountModal
          userId={user.id}
          onClose={() => setShowCreditModal(false)}
          onSuccess={refetchEntries}
        />
      ) : (
        <SimpleCreditModal
          userId={user.id}
          onClose={() => setShowCreditModal(false)}
          onSuccess={refetchEntries}
        />
      ))}
    </>
  );
};

export default AccountList;
